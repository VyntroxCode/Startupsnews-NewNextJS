'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';

interface PolicyData {
  shiftStartTime: string;
  shiftEndTime: string;
  shiftGraceMinutes: number;
  regularizationWindowDays: number;
  regularizationMonthlyQuota: number;
  shortLeaveMonthlyQuota: number;
  halfDayMinWorkedHours: number;
  shortLeaveMinWorkedHours: number;
  fullDayMinWorkedHours: number;
  geoFencing?: boolean;
  geoFenceRadiusM?: number;
}

/** "HH:MM" -> minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutes since midnight -> "10:15 am". */
function clock(totalMinutes: number): string {
  const mins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(mins / 60), mm = mins % 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'pm' : 'am'}`;
}

/** Decimal hours -> "8h 15m" / "7h 30m" / "8h". */
function duration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60), m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type Tone = 'full' | 'short' | 'half' | 'absent';

const TONE: Record<Tone, { dot: string; bar: string; pill: string }> = {
  full: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  short: { dot: 'bg-amber-400', bar: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  half: { dot: 'bg-orange-500', bar: 'bg-orange-500', pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
  absent: { dot: 'bg-rose-500', bar: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

interface Band {
  tone: Tone;
  status: string;
  /** Hours-worked range this band covers, [from, to). `to` null = open-ended. */
  from: number;
  to: number | null;
  pay: string;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <p className="mt-1.5 text-sm leading-snug text-slate-500">{hint}</p>
    </div>
  );
}

interface PolicySummaryWidgetProps {
  /** Base path for the attendance API — defaults to the Publisher/Event Admin routes. */
  apiBase?: string;
  /** Auth header provider — defaults to the admin panel's session. */
  getHeaders?: () => HeadersInit;
}

/** Read-only "Admin Rules" summary of what HR set under HR Management → Rules & Org Structure:
 * shift, grace period, regularization window/limit, and how hours worked decide a day's status
 * (mirrors hoursWorkedBucket/realDayHoursBucket in src/modules/hr-tool/utils/lateness.ts — hours
 * alone decide the day, credited only inside the shift window; arrival time only marks "late").
 * Reused by the Publisher/Event Admin dashboard (default props) and the plain employee dashboard
 * (apiBase="/api/employee/attendance", getHeaders=getEmployeeAuthHeaders). Styled with Tailwind
 * via src/components/admin/rules-policy-tailwind.css. */
export default function PolicySummaryWidget({ apiBase = '/api/admin/attendance', getHeaders = getAuthHeaders }: PolicySummaryWidgetProps) {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/policy`, { headers: getHeaders() });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load rules');
        setPolicy(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rules');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading rules…</div>;
  }

  if (error || !policy) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error || 'Failed to load rules.'}
      </div>
    );
  }

  const shiftStart = toMinutes(policy.shiftStartTime);
  const shiftEnd = toMinutes(policy.shiftEndTime);
  const shiftHours = Math.max(0, shiftEnd - shiftStart) / 60;
  const halfMin = Number(policy.halfDayMinWorkedHours) || 0;
  const shortMin = Number(policy.shortLeaveMinWorkedHours) || 0;
  const fullMin = Number(policy.fullDayMinWorkedHours) || 0;

  const shortLeavePay = `Paid as a full day, but counts as a Short Leave (${policy.shortLeaveMonthlyQuota} allowed per month). Every 3rd Short Leave deducts half a day's pay — leftovers carry into the next payroll cycle.`;
  const bands: Band[] = ([
    { tone: 'full', status: 'Full day', from: fullMin, to: null, pay: 'Full day’s pay.' },
    { tone: 'short', status: 'Short Leave', from: shortMin, to: fullMin, pay: shortLeavePay },
    { tone: 'half', status: 'Half day', from: halfMin, to: shortMin, pay: 'Half a day’s pay.' },
    { tone: 'absent', status: 'Absent', from: 0, to: halfMin, pay: 'No pay for the day.' },
  ] as Band[]).filter((b) => b.to === null || b.to > b.from);

  const rangeLabel = (b: Band) =>
    b.to === null ? `${duration(b.from)} or more` : b.from === 0 ? `Less than ${duration(b.to)}` : `${duration(b.from)} to under ${duration(b.to)}`;

  // Worked example: punching out exactly at shift end, which punch-in times land in each band.
  const latestIn = (hours: number) => clock(shiftEnd - hours * 60);
  const exampleLabel = (b: Band) =>
    b.to === null
      ? `Punch in by ${latestIn(b.from)}`
      : b.from === 0
        ? `Punch in after ${latestIn(b.to)}`
        : `Punch in after ${latestIn(b.to)}, by ${latestIn(b.from)}`;

  // Timeline bar, 0h → shift length, best band on the right.
  const scale = Math.max(shiftHours, fullMin, 1);
  const segments = [...bands].reverse().map((b) => {
    const end = b.to === null ? scale : Math.min(b.to, scale);
    return { ...b, width: Math.max(0, ((end - b.from) / scale) * 100) };
  });
  const ticks = Array.from(new Set([halfMin, shortMin, fullMin].filter((h) => h > 0 && h < scale)));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Shift &amp; regularization</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Shift timings"
            value={`${clock(shiftStart)} – ${clock(shiftEnd)}`}
            hint={`Official punch-in and punch-out time · ${duration(shiftHours)} shift.`}
          />
          <StatCard
            label="Grace period"
            value={`${policy.shiftGraceMinutes} min`}
            hint={`Punch in by ${clock(shiftStart + Number(policy.shiftGraceMinutes || 0))} and you're on time. Later is marked Late.`}
          />
          <StatCard
            label="Regularization window"
            value={`${policy.regularizationWindowDays} days`}
            hint="How many days after an attendance date you may still request a correction."
          />
          <StatCard
            label="Regularization limit"
            value={`${policy.regularizationMonthlyQuota} / cycle`}
            hint="Requests you may submit per payroll cycle (26th to 25th)."
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">How your day is counted</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Your day&apos;s status depends only on the hours you work — the time between your punch-in and punch-out.
          Coming in late is marked <span className="font-medium text-slate-700">Late</span>, but costs nothing by itself as long as you complete the hours.
        </p>

        <div className="mt-6">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {segments.map((s) => (
              <div key={s.tone} className={TONE[s.tone].bar} style={{ width: `${s.width}%` }} title={`${s.status}: ${rangeLabel(s)}`} />
            ))}
          </div>
          <div className="relative mt-1.5 h-5 text-xs font-medium text-slate-500">
            <span className="absolute left-0">0h</span>
            {ticks.map((h) => (
              <span key={h} className={`absolute ${h / scale > 0.9 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${(h / scale) * 100}%` }}>{duration(h)}</span>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
          <div className="hidden grid-cols-12 gap-4 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <div className="col-span-3">Hours worked</div>
            <div className="col-span-2">Day status</div>
            <div className="col-span-4">What it means</div>
            <div className="col-span-3">Example · punch out at {clock(shiftEnd)}</div>
          </div>
          {bands.map((b) => (
            <div key={b.tone} className="grid grid-cols-1 gap-2 border-t border-slate-200 px-4 py-4 first:border-t-0 md:grid-cols-12 md:gap-4 md:first:border-t">
              <div className="flex items-center gap-2.5 md:col-span-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[b.tone].dot}`} />
                <span className="text-sm font-semibold text-slate-900">{rangeLabel(b)}</span>
              </div>
              <div className="md:col-span-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[b.tone].pill}`}>{b.status}</span>
              </div>
              <div className="text-sm leading-snug text-slate-600 md:col-span-4">{b.pay}</div>
              <div className="text-sm text-slate-500 md:col-span-3">{exampleLabel(b)}</div>
            </div>
          ))}
        </div>

        <ul className="mt-5 flex flex-col gap-2 text-sm leading-snug text-slate-600">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>Only time inside the shift ({clock(shiftStart)} – {clock(shiftEnd)}) counts. Coming in early or staying late doesn&apos;t add hours.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>Forgot to punch out? The day counts as Absent until a regularization request is approved.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>Work From Home: apply from the Leave page. Once approved, each WFH day is marked as a full day automatically — no punching needed.</span>
          </li>
          {policy.geoFencing && (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>Punch In and Punch Out work only within {policy.geoFenceRadiusM ?? 50} m of the office — allow location access in your browser when asked.</span>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
