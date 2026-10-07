'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LEDGER_KIND_LABEL, lopBreakdown, shortLeaveDeductedPositions, shortLeaveRuleShort, type EmployeeCycleLedger, type LedgerDay, type LedgerDayKind, type LedgerTotals } from '@/modules/hr-tool/utils/day-ledger';
import { ABSENCE_COVER_TYPE } from '@/modules/hr-tool/utils/leave-balance';
import { formatTime12h } from '@/modules/hr-tool/utils/lateness';

type LeaveCard = EmployeeCycleLedger['leave'][number];
interface CycleData {
  month: string; periodFrom: string; periodTo: string; totals: LedgerTotals; leave: LeaveCard[]; locked: boolean;
  days: LedgerDay[];
  payrollRun: boolean; shortLeaveQuota: number;
  regularizations: { pending: number; applied: number; approved: number; limitUsed: number; quota: number };
  /** One dot per date on the calendar — amber pending, violet approved. */
  regDays?: { date: string; state: 'pending' | 'approved' }[];
}

function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const ordinal = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;

const DOWS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Tile colours — the same palette, per status, as the HR attendance calendar's summary tiles. */
const TONE = {
  neutral: 'border-slate-200 bg-white text-slate-900',
  present: 'border-green-200 bg-green-50 text-green-900',
  halfDay: 'border-orange-200 bg-orange-50 text-orange-900',
  shortLeave: 'border-amber-200 bg-amber-50 text-amber-900',
  absent: 'border-red-200 bg-red-50 text-red-900',
  off: 'border-slate-200 bg-slate-50 text-slate-700',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  leave: 'border-blue-200 bg-blue-50 text-blue-900',
  regPending: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  regApplied: 'border-violet-200 bg-violet-50 text-violet-900',
};

/** Day-square colours per ledger kind — the same as HR's attendance calendar (.cal-cell.* in
 * hr-tool/HrToolApp.tsx), so HR and the employee see one picture. */
const DAY_TONE: Record<LedgerDayKind, string> = {
  present: 'border-green-200 bg-green-100 text-green-900',
  'short-leave': 'border-amber-200 bg-amber-100 text-amber-800',
  'half-day': 'border-orange-300 bg-orange-200 text-orange-800',
  absent: 'border-red-300 bg-red-200 text-red-900',
  leave: 'border-blue-200 bg-blue-100 text-blue-900',
  'unpaid-leave': 'border-red-300 bg-[repeating-linear-gradient(135deg,#DBEAFE_0_6px,#FECACA_6px_12px)] text-red-900',
  'half-leave': 'border-blue-200 bg-[linear-gradient(135deg,#DBEAFE_50%,#FED7AA_50%)] text-blue-900',
  off: 'border-slate-200 bg-slate-100 text-slate-500',
  settled: 'border-dashed border-green-300 bg-green-50 text-green-800',
  future: 'border-dashed border-slate-300 bg-white text-slate-400',
  'not-employed': 'border-slate-200 bg-[repeating-linear-gradient(135deg,#F8FAFC_0_6px,#EEF2F7_6px_12px)] text-slate-400',
};

const LEGEND: { label: string; swatch: string }[] = [
  { label: 'Present', swatch: DAY_TONE.present },
  { label: 'Short leave', swatch: DAY_TONE['short-leave'] },
  { label: 'Half day', swatch: DAY_TONE['half-day'] },
  { label: 'Absent', swatch: DAY_TONE.absent },
  { label: 'Paid leave', swatch: DAY_TONE.leave },
  { label: 'Unpaid leave', swatch: DAY_TONE['unpaid-leave'] },
  { label: 'Half-day leave', swatch: DAY_TONE['half-leave'] },
  { label: 'Week-off', swatch: DAY_TONE.off },
  { label: 'Paid in earlier run', swatch: DAY_TONE.settled },
  { label: 'Not employed', swatch: DAY_TONE['not-employed'] },
  { label: 'Regularization pending', swatch: 'rounded-full border-amber-600 bg-amber-600' },
  { label: 'Regularized', swatch: 'rounded-full border-violet-600 bg-violet-600' },
  { label: 'Set by HR', swatch: 'border-2 border-teal-700 bg-white' },
];

/** The small note on a square — the same wording HR's calendar uses. */
function dayNote(day: LedgerDay): string | null {
  if (day.hrSet) return `set by HR${day.kind === 'short-leave' && day.shortLeaveDeducted ? ' · ½ deducted' : ''}`;
  if (day.autoLeave) return `${day.kind === 'leave' ? '' : '½ '}auto ${ABSENCE_COVER_TYPE.toLowerCase()}`;
  if (day.kind === 'short-leave' && day.shortLeaveDeducted) return '½ deducted';
  if (day.kind === 'half-leave') return `½ leave${day.unpaidLeave > 0 ? ' (unpaid)' : ''}`;
  if (day.kind === 'unpaid-leave') return 'unpaid';
  return null;
}

/** How payroll counts one day, in plain words — the same sentence HR's day popup shows. */
export function describeLedgerDay(day: LedgerDay, shortLeaveQuota: number): string {
  const detail = day.kind === 'absent' && day.inMinutes != null && day.outMinutes == null ? ' — no punch-out'
    : day.kind === 'short-leave' && day.shortLeaveDeducted ? ` — half a day deducted (the ${shortLeaveDeductedPositions(shortLeaveQuota).map(ordinal).join(', ')}… short leaves of a cycle cost ½ day)`
    : day.kind === 'half-leave' ? ` — ${fmtNum(day.paidLeave)} paid leave${day.unpaidLeave ? `, ${fmtNum(day.unpaidLeave)} unpaid` : ''}, ${fmtNum(day.worked)} worked`
    : '';
  if (day.autoLeave) {
    const what = day.kind === 'half-leave' ? 'Half day' : day.kind === 'short-leave' ? 'Short leave' : 'Absent';
    const part = day.kind === 'leave' ? '' : ` — the missing ${fmtNum(day.paidLeave)} day`;
    return `${what}${part} paid from ${ABSENCE_COVER_TYPE} leave automatically (no leave request) · pays ${fmtNum(day.pay)} day`;
  }
  return `${LEDGER_KIND_LABEL[day.kind]}${detail}${day.hrSet ? ' — set by HR' : ''} · pays ${fmtNum(day.pay)} day`;
}

function Tile({ label, value, unit, sub, tone, wide }: { label: string; value: number; unit?: string; sub?: string; tone: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-solid p-3 ${tone} ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">
        {fmtNum(value)}{unit && <span className="text-xs font-semibold"> {unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[0.7rem] leading-snug opacity-75">{sub}</div>}
    </div>
  );
}

/** "Pay cycle" card on the self-service attendance page — the employee's own days for one pay
 * cycle (e.g. 26 Aug – 25 Sep), from the same day ledger payroll pays by (`${apiBase}/ledger`), so
 * what they see here is what their payslip counts. Laid out like HR's attendance calendar
 * (hr-tool/views/AttendanceCalendar.tsx): the same tiles, then the same day-by-day grid — same
 * colours, notes and legend — so HR and the employee read the numbers the same way. Salary figures
 * stay out. A square opens that day in the page's day-details card (`onSelectDate`); `onDays`
 * hands the loaded days up so that card can say how payroll counts the day. `refreshKey` changes
 * whenever the attendance page reloads (a punch, a regularization), triggering a re-fetch. */
export default function AttendanceCycleSummary({ apiBase, getHeaders, refreshKey, today, selectedDate, onSelectDate, onDays }: {
  apiBase: string; getHeaders: () => HeadersInit; refreshKey: unknown;
  today: string; selectedDate: string; onSelectDate: (date: string) => void;
  onDays: (days: LedgerDay[], shortLeaveQuota: number) => void;
}) {
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [data, setData] = useState<CycleData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`${apiBase}/ledger${monthKey ? `?month=${monthKey}` : ''}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((json) => {
        if (!live) return;
        if (!json.success) { setError(json.error || 'Could not load this pay cycle.'); return; }
        setError('');
        setData(json.data);
        if (json.data) onDays(json.data.days || [], json.data.shortLeaveQuota ?? 0);
        if (json.data && !currentKey) setCurrentKey(json.data.month);
      })
      .catch(() => { if (live) setError('Could not load this pay cycle.'); });
    return () => { live = false; };
  }, [apiBase, monthKey, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="m-0 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="m-0 text-sm text-slate-500">Loading pay cycle…</p>;
  const t = data.totals;
  // Guard against an older/partial API response — a missing block must never crash the dashboard.
  const reg = data.regularizations ?? { pending: 0, applied: 0, approved: 0, limitUsed: 0, quota: 0 };
  const days = data.days ?? [];
  const regByDate = new Map((data.regDays ?? []).map((r) => [r.date, r.state]));
  const canGoNext = !!currentKey && data.month < currentKey;
  const isCurrent = !!currentKey && data.month === currentKey;
  // Everything that was judged (worked, paid leave, loss of pay) — week-offs and future days aside.
  const judged = t.presentDays + t.leaveDays + t.lopDays;
  const payrollNote = data.locked ? 'payroll frozen (final)' : data.payrollRun ? 'payroll run as a draft' : isCurrent ? 'estimate so far' : 'payroll not run yet';
  const leadBlanks = new Date(data.periodFrom + 'T00:00:00').getDay();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => setMonthKey(shiftMonthKey(data.month, -1))} aria-label="Previous pay cycle"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-700">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="text-center">
          <h3 className="m-0 text-base font-semibold text-slate-900">Pay cycle {fmtDate(data.periodFrom)} – {fmtDate(data.periodTo)}{isCurrent ? ' (in progress)' : ''}</h3>
          <p className="m-0 text-xs text-slate-500">
            <strong className="text-slate-900">{fmtNum(t.paidDays)}</strong> of <strong className="text-slate-900">{t.totalDays}</strong> days paid
            {t.lopDays > 0 && <> · <strong className="text-red-800">{fmtNum(t.lopDays)}</strong> LOP</>}
          </p>
        </div>
        <button type="button" onClick={() => canGoNext && setMonthKey(shiftMonthKey(data.month, 1))} disabled={!canGoNext} aria-label="Next pay cycle"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      {judged > 0 && (
        <div className="mb-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100" role="img"
          aria-label={`${fmtNum(t.presentDays)} worked, ${fmtNum(t.leaveDays)} paid leave, ${fmtNum(t.lopDays)} loss of pay`}>
          {t.presentDays > 0 && <span className="bg-green-600" style={{ width: `${(t.presentDays / judged) * 100}%` }} />}
          {t.leaveDays > 0 && <span className="bg-blue-600" style={{ width: `${(t.leaveDays / judged) * 100}%` }} />}
          {t.lopDays > 0 && <span className="bg-red-600" style={{ width: `${(t.lopDays / judged) * 100}%` }} />}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Days in cycle" value={t.totalDays} sub={`${t.workingDays} working`} tone={TONE.neutral} />
        <Tile label="Present" value={t.presentDays} tone={TONE.present} />
        <Tile label="Half day" value={t.halfDayDays} tone={TONE.halfDay} />
        <Tile label="Short leaves" value={t.shortLeaveDays}
          sub={`${shortLeaveRuleShort(data.shortLeaveQuota)}${t.shortLeaveDeductions > 0 ? ` · ${t.shortLeaveDeductions} deducted` : ''}`} tone={TONE.shortLeave} />
        <Tile label="Absent" value={t.absentDays} tone={TONE.absent} />
        <Tile label="LOP days" value={t.lopDays} sub={t.lopDays > 0 ? lopBreakdown(t) : 'no pay lost'} tone={TONE.absent} />
        <Tile label="Week-offs" value={t.weekOffDays} sub="Sundays + holidays" tone={TONE.off} />
        <Tile label="Paid days" value={t.paidDays} sub={t.futureDays ? `${t.futureDays} still to come` : undefined} tone={TONE.paid} />
        {(data.leave ?? []).map((l) => {
          const used = l.paidInCycle + l.autoInCycle;
          return (
            <Tile key={l.type} wide label={`${l.type} leave`} value={l.available} unit="available" tone={TONE.leave}
              sub={`${isCurrent ? 'This month' : 'In this month'}: ${fmtNum(used)} used${l.autoInCycle > 0 ? ` (${fmtNum(l.autoInCycle)} automatic, for absences / half days)` : ''}${l.unpaidInCycle > 0 ? ` · ${fmtNum(l.unpaidInCycle)} unpaid` : ''}${l.pendingInCycle > 0 ? ` · ${fmtNum(l.pendingInCycle)} waiting` : ''}`} />
          );
        })}
        <Tile label="Reg. pending" value={reg.pending} tone={TONE.regPending} />
        <Tile label="Regularizations" value={reg.applied} unit="applied" sub={`${reg.approved} approved · limit used ${reg.limitUsed} of ${reg.quota}`} tone={TONE.regApplied} />
      </div>
      <div className="mt-3 rounded-lg border border-solid border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        Payslip for this cycle: <strong className="text-slate-900">{fmtNum(t.paidDays)} paid days</strong> · {payrollNote}
      </div>

      {/* Day by day — the same squares HR sees, one per day of the cycle (26th → 25th). */}
      <div className="mt-4 mb-1 grid grid-cols-7 gap-1 sm:gap-1.5">
        {DOWS.map((d) => <div key={d} className="text-center text-[0.65rem] font-bold uppercase text-slate-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: leadBlanks }, (_, i) => <div key={`b${i}`} />)}
        {days.map((day, i) => {
          const dom = Number(day.date.slice(8, 10));
          const label = i === 0 || dom === 1 ? `${dom} ${new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}` : String(dom);
          const note = dayNote(day);
          const regState = regByDate.get(day.date);
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          return (
            <button type="button" key={day.date} onClick={() => onSelectDate(day.date)} aria-pressed={isSelected}
              title={`${LEDGER_KIND_LABEL[day.kind]} — pays ${fmtNum(day.pay)} day`}
              className={`relative flex min-h-11 cursor-pointer flex-col items-start rounded-lg border border-solid p-1 text-left font-[inherit] sm:min-h-[3.75rem] sm:p-1.5 ${DAY_TONE[day.kind]} ${day.hrSet ? 'shadow-[inset_0_0_0_2px_#0F766E]' : ''} ${isSelected ? 'ring-2 ring-slate-700 ring-offset-1' : ''}`}>
              <span className={`text-[0.7rem] leading-tight ${isToday ? 'font-extrabold underline' : 'font-bold'}`}>{label}</span>
              {(day.inMinutes != null || day.outMinutes != null) && (
                <span className="mt-0.5 hidden text-[0.625rem] font-medium leading-tight tabular-nums sm:block">
                  <span className="block whitespace-nowrap">In {day.inMinutes != null ? formatTime12h(day.inMinutes) : '—'}</span>
                  <span className="block whitespace-nowrap">Out {day.outMinutes != null ? formatTime12h(day.outMinutes) : '—'}</span>
                </span>
              )}
              {note && <span className="mt-0.5 hidden text-[0.6rem] font-semibold leading-tight opacity-85 sm:block">{note}</span>}
              {regState && <span className={`absolute top-1 right-1 h-2 w-2 rounded-full ${regState === 'pending' ? 'bg-amber-600' : 'bg-violet-600'}`} aria-label={regState === 'pending' ? 'Regularization pending' : 'Regularized'} />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:gap-x-4">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-3 w-3 shrink-0 rounded-[3px] border border-solid ${l.swatch}`} />{l.label}
          </span>
        ))}
      </div>

      <p className="m-0 mt-3 text-xs leading-relaxed text-slate-500">
        Tap a day to see how it was counted. A working day with no punch-in, or a punch-in with no punch-out, is absent. A day without an approved leave request is absent (loss of pay) even if you have Casual leave left — apply for leave to use it. A day you punched in on can only take half-day leave.
        Changes HR approves (regularizations, leave) show up here straight away.
      </p>
    </div>
  );
}
