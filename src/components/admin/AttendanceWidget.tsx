'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';
import PunchOutTimeInput from './PunchOutTimeInput';
import { getCurrentBrowserLocation, geofenceHintFor, type BrowserLocation } from '@/lib/browser-geolocation';
import { latenessBucket, combinedAttendanceBucket, type ShiftSettings, type LatenessBucket } from '@/modules/hr-tool/utils/lateness';

interface AttendanceDayRecord { date: string; status: string; inTime: string; outTime: string; inMinutes: number | null; outMinutes: number | null; }
interface HolidayRecord { date: string; name: string; }
interface RegularizationRecord {
  id: string; date: string; reason: string; punchType: 'in' | 'out'; requestedTime: string | null;
  stage: string; status: string; rmRemarks: string; hrRemarks: string;
}
interface AttendanceMeData {
  linked: boolean;
  /** Today's punch, independent of which month the calendar is showing. */
  today?: { inTime: string | null; outTime: string | null; inMinutes: number | null; outMinutes: number | null };
  employeeCode?: string;
  name?: string;
  month?: string;
  calendar?: AttendanceDayRecord[];
  holidays?: HolidayRecord[];
  shiftRules?: ShiftSettings & { shiftEndTime: string };
  regularizations?: RegularizationRecord[];
  regularizationPolicy?: { windowDays: number; monthlyQuota: number; usedThisMonth: number };
  /** When enabled, punch() asks the browser for a GPS fix first; the server does the actual check. */
  geofence?: { enabled: boolean; radiusM: number };
}

const cardClass = 'rounded-xl border border-solid border-black/5 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm box-border sm:p-6 md:p-8';

const actionButtonClass = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300';
const blueButtonClass = `${actionButtonClass} bg-gradient-to-br from-blue-400 to-blue-500`;
const secondaryButtonClass = 'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60';

const navButtonClass = 'flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-xl text-slate-700 disabled:cursor-not-allowed disabled:opacity-35';

/** Matches the DB's date-column convention already used across the HR Tool (see hr-tool's own
 * client-side todayStr()) — UTC-based, not locale/timezone-aware, kept consistent on purpose. */
function localTodayStr(): string { return new Date().toISOString().slice(0, 10); }

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function daysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function firstWeekday(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}
function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Tailwind bg / border / text per bucket — the same palette the calendar has always used. */
const BUCKET_TONE: Record<LatenessBucket, string> = {
  'on-time': 'bg-green-100 border-green-400 text-green-800',
  grace: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  late: 'bg-orange-100 border-orange-400 text-orange-700',
  'short-leave': 'bg-orange-100 border-orange-400 text-orange-700',
  'half-day': 'bg-orange-200 border-orange-500 text-orange-800',
  absent: 'bg-red-100 border-red-400 text-red-700',
};

/** Short Leave / Half Day / Absent now carry real payroll consequences (see
 * HrToolService.computePayrollForMonth), so unlike the old 3-way grace/late split these are
 * shown to employees by their real name, not a vague "late"/"very late". */
const BUCKET_LABEL: Record<LatenessBucket, string> = {
  'on-time': 'On time', grace: 'Grace Period', late: 'Late', 'short-leave': 'Short Leave', 'half-day': 'Half Day', absent: 'Absent',
};

/** A date with a regularization request on file shows light blue on the calendar, overriding
 * whatever lateness color it would otherwise have — the request itself is now the more
 * relevant status for that day. */
const REG_TONE = 'bg-blue-100 border-blue-400 text-blue-800';
const REG_STATUS_LABEL: Record<string, string> = { pending: 'Pending admin approval', approved: 'Approved', rejected: 'Rejected' };
const REG_TYPE_LABEL: Record<'in' | 'out', string> = { in: 'Punch In', out: 'Punch Out' };

/** A day on the admin's Holiday calendar (HR Management → Rules & Org Structure) — shown in
 * violet, distinct from every lateness/regularization color, on both the calendar grid and the
 * selected-date detail panel. */
const HOLIDAY_TONE = 'bg-violet-100 border-violet-400 text-violet-700';

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 sm:text-[0.8rem]">
      <span className={`h-3 w-3 shrink-0 rounded-[3px] border border-solid ${tone}`} />
      {label}
    </div>
  );
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface AttendanceWidgetProps {
  /** Base path for the attendance API — defaults to the Publisher/Event Admin routes. */
  apiBase?: string;
  /** Auth header provider — defaults to the admin panel's session. */
  getHeaders?: () => HeadersInit;
}

/** Attendance card — resolves the caller's HR identity and writes into the same
 * hr_attendance/hr_punch_log tables the Founder's HR Tool Attendance view already reads.
 * A "Today" card always leads (live clock, today's punch times and full-width Punch In / Punch Out
 * buttons — the one thing staff open this page for, sized for a thumb on a phone). Picking any
 * other day in the month calendar below adds a "day details" card (status, punch times,
 * regularization) for that date. The calendar colors each day green/orange/red by how the
 * punch-in landed against the admin-configured shift start + grace period. Reused as-is
 * by both the Publisher/Event Admin dashboard (default props) and the plain employee dashboard
 * (apiBase="/api/employee/attendance", getHeaders=getEmployeeAuthHeaders). */
export default function AttendanceWidget({ apiBase = '/api/admin/attendance', getHeaders = getAuthHeaders }: AttendanceWidgetProps) {
  const today = localTodayStr();
  const [data, setData] = useState<AttendanceMeData | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [punching, setPunching] = useState<'in' | 'out' | null>(null);
  /** Sub-phase of `punching`: true while waiting on the browser's GPS fix (can take 5–15 s indoors). */
  const [locating, setLocating] = useState(false);
  const [errorHint, setErrorHint] = useState('');
  const [regFormOpen, setRegFormOpen] = useState<'in' | 'out' | null>(null);
  const [regReason, setRegReason] = useState('');
  const [regTime, setRegTime] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const load = async (month: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/me?month=${month}`, { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load attendance');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(calendarMonth); }, [calendarMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  async function punch(type: 'in' | 'out') {
    setPunching(type);
    setError('');
    setErrorHint('');
    setNote('');
    try {
      // Geofencing on → get a fresh GPS fix first. The server re-checks it against the office
      // fence; this just supplies the coordinates and turns browser failures into plain words.
      let location: BrowserLocation | undefined;
      if (data?.geofence?.enabled) {
        setLocating(true);
        try {
          location = await getCurrentBrowserLocation();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not get your location.');
          return;
        } finally {
          setLocating(false);
        }
      }

      const res = await fetch(`${apiBase}/punch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type, location }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to record punch');
        setErrorHint(geofenceHintFor(json.code) || '');
        return;
      }
      if (json.data?.note) setNote(json.data.note);
      else if (json.data?.geo && typeof json.data.geo.distanceM === 'number') setNote(`Recorded ${Math.round(json.data.geo.distanceM)} m from the office.`);
      await load(calendarMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record punch');
    } finally {
      setPunching(null);
    }
  }

  async function submitRegularization() {
    const punchType = regFormOpen;
    if (!punchType) return;
    const reason = regReason.trim();
    if (!reason) { setRegError('Please describe the reason.'); return; }
    const time = regTime.trim();
    if (!time) { setRegError('Please set the time you are regularizing.'); return; }
    setRegSubmitting(true);
    setRegError('');
    try {
      const res = await fetch(`${apiBase}/regularizations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ date: selectedDate, reason, punchType, requestedTime: time }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to submit regularization request');
      setRegFormOpen(null);
      setRegReason('');
      setRegTime('');
      await load(calendarMonth);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Failed to submit regularization request');
    } finally {
      setRegSubmitting(false);
    }
  }

  const calendarMap = useMemo(() => {
    const map = new Map<string, AttendanceDayRecord>();
    (data?.calendar || []).forEach((r) => map.set(r.date, r));
    return map;
  }, [data]);

  const regularizationByDate = useMemo(() => {
    const map = new Map<string, RegularizationRecord[]>();
    (data?.regularizations || []).forEach((r) => map.set(r.date, [...(map.get(r.date) || []), r]));
    return map;
  }, [data]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    (data?.holidays || []).forEach((h) => map.set(h.date, h.name));
    return map;
  }, [data]);

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setRegFormOpen(null);
    setRegReason('');
    setRegTime('');
    setRegError('');
  }

  function changeMonth(delta: number) {
    const newMonth = shiftMonth(calendarMonth, delta);
    const day = Number(selectedDate.slice(8, 10));
    const clampedDay = Math.min(day, daysInMonth(newMonth));
    selectDate(`${newMonth}-${String(clampedDay).padStart(2, '0')}`);
    setCalendarMonth(newMonth);
  }

  if (loading && !data) {
    return (
      <div className={`${cardClass} mt-4 md:mt-6`}>
        <p className="m-0 text-slate-500">Loading attendance…</p>
      </div>
    );
  }

  if (!data?.linked) {
    return (
      <div className={`${cardClass} mt-4 md:mt-6`}>
        <h2 className="m-0 mb-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">Attendance</h2>
        <p className="m-0 text-[0.9375rem] text-slate-500">
          No Employee ID has been assigned to your account yet. Ask your Founder to assign one under HR Management → Assigning IDs to start marking attendance.
        </p>
      </div>
    );
  }

  const shiftRules = data.shiftRules;
  const selectedRecord = calendarMap.get(selectedDate);
  const isSelectedToday = selectedDate === today;
  const hasIn = !!selectedRecord?.inTime && selectedRecord.inTime !== '—';
  const hasOut = !!selectedRecord?.outTime && selectedRecord.outTime !== '—';
  const selectedHoliday = holidayMap.get(selectedDate);
  const rowStatus = selectedHoliday ? `Holiday — ${selectedHoliday}` : (selectedRecord?.status === 'WFH' ? 'Work From Home — full day' : selectedRecord?.status) || (isSelectedToday ? 'Not punched in yet' : 'No record');
  // Combined bucket (arrival time + hours worked, worse of the two) drives the day's displayed
  // status/color; the pure arrival-time bucket separately gates punch-in Regularization, since
  // that's specifically about correcting the punch-in itself, not the day's overall outcome —
  // an on-time arrival shouldn't become "regularizable" just because they left early.
  const selectedBucket = shiftRules ? combinedAttendanceBucket(selectedRecord?.inMinutes ?? null, selectedRecord?.outMinutes ?? null, shiftRules, false) : null;
  const selectedTimeBucket = shiftRules ? latenessBucket(selectedRecord?.inMinutes ?? null, shiftRules) : null;
  const selectedRegs = regularizationByDate.get(selectedDate) || [];
  const selectedRegIn = selectedRegs.find((r) => r.punchType === 'in');
  const selectedRegOut = selectedRegs.find((r) => r.punchType === 'out');
  const regPolicy = data.regularizationPolicy;
  const quotaReached = !!regPolicy && regPolicy.usedThisMonth >= regPolicy.monthlyQuota;
  // A punch that never happened is exactly what regularization is for — someone who forgot to
  // punch in and only punched out would otherwise be left with a permanently broken day, since a
  // missing punch-in has no lateness bucket at all. Only an on-time punch-in has nothing to
  // correct. Future dates are excluded because there is nothing there to fix yet.
  const isSelectedFuture = selectedDate > today;
  const canRequestInRegularization = !selectedRegIn && !isSelectedFuture
    && (!hasIn || (!!selectedTimeBucket && selectedTimeBucket !== 'on-time'));
  const canRequestOutRegularization = !selectedRegOut && !isSelectedToday && !isSelectedFuture && !hasOut;

  // Today's punch comes from the API's own `today` block, so the Today card stays right even while
  // the calendar is showing an earlier month (whose `calendar` rows don't include today).
  const todayRecord = calendarMap.get(today);
  const todayIn = data.today ? data.today.inTime : (todayRecord?.inTime && todayRecord.inTime !== '—' ? todayRecord.inTime : null);
  const todayOut = data.today ? data.today.outTime : (todayRecord?.outTime && todayRecord.outTime !== '—' ? todayRecord.outTime : null);
  const todayInMinutes = data.today ? data.today.inMinutes : todayRecord?.inMinutes ?? null;
  const todayOutMinutes = data.today ? data.today.outMinutes : todayRecord?.outMinutes ?? null;
  const todayBucket = shiftRules && todayIn ? combinedAttendanceBucket(todayInMinutes, todayOutMinutes, shiftRules, false) : null;
  const todayHoliday = holidayMap.get(today);

  const totalDays = daysInMonth(calendarMonth);
  const leadPad = firstWeekday(calendarMonth);
  const cells: (number | null)[] = [...Array(leadPad).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const canGoNext = calendarMonth < today.slice(0, 7);

  const punchLabel = (type: 'in' | 'out') => (punching === type
    ? (locating ? 'Getting your location…' : type === 'in' ? 'Punching in…' : 'Punching out…')
    : type === 'in' ? 'Punch In' : 'Punch Out');

  const regularizationBlock = (
    <>
      {(selectedRegIn || selectedRegOut) && (
        <div className="mt-3 flex flex-col gap-1">
          {selectedRegIn && (
            <p className="m-0 text-sm font-semibold text-blue-800">
              Punch In regularization ({selectedRegIn.requestedTime}) — {REG_STATUS_LABEL[selectedRegIn.status] || selectedRegIn.status}
            </p>
          )}
          {selectedRegOut && (
            <p className="m-0 text-sm font-semibold text-blue-800">
              Punch Out regularization ({selectedRegOut.requestedTime}) — {REG_STATUS_LABEL[selectedRegOut.status] || selectedRegOut.status}
            </p>
          )}
        </div>
      )}

      {(canRequestInRegularization || canRequestOutRegularization) && (
        <div className="mt-4 border-t border-solid border-slate-200 pt-4">
          {!regFormOpen ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {canRequestInRegularization && (
                <button type="button" onClick={() => setRegFormOpen('in')} disabled={quotaReached} className={`${blueButtonClass} w-full sm:w-auto`}>
                  Regularize Punch In
                </button>
              )}
              {canRequestOutRegularization && (
                <button type="button" onClick={() => setRegFormOpen('out')} disabled={quotaReached} className={`${blueButtonClass} w-full sm:w-auto`}>
                  Regularize Punch Out
                </button>
              )}
              {regPolicy && (
                <span className="text-center text-xs text-slate-400 sm:text-left sm:text-[0.8rem]">
                  {regPolicy.usedThisMonth} of {regPolicy.monthlyQuota} used this month
                  {quotaReached ? ' — limit reached' : ''}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:max-w-[420px]">
              <p className="m-0 text-sm font-semibold text-slate-700">Regularizing: {REG_TYPE_LABEL[regFormOpen]}</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">{REG_TYPE_LABEL[regFormOpen]} time</label>
                {/* Punch Out is always PM (office closes in the evening), so no AM/PM choice. */}
                {regFormOpen === 'out' ? (
                  <div className="text-sm">
                    <PunchOutTimeInput
                      value={regTime}
                      onChange={setRegTime}
                      selectClassName="min-h-11 rounded-lg border border-solid border-slate-200 bg-white px-2.5 text-base sm:text-sm"
                    />
                  </div>
                ) : (
                  <input
                    type="time"
                    value={regTime}
                    onChange={(e) => setRegTime(e.target.value)}
                    className="box-border min-h-11 w-full rounded-lg border border-solid border-slate-200 bg-white px-3 text-base sm:w-auto sm:text-sm"
                  />
                )}
              </div>
              <textarea
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
                placeholder="Reason for regularization…"
                rows={3}
                className="box-border block w-full rounded-lg border border-solid border-slate-200 bg-white p-3 font-[inherit] text-base sm:text-sm"
              />
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                <button type="button" onClick={submitRegularization} disabled={regSubmitting} className={blueButtonClass}>
                  {regSubmitting ? 'Submitting…' : 'Submit'}
                </button>
                <button type="button" onClick={() => { setRegFormOpen(null); setRegReason(''); setRegTime(''); setRegError(''); }} disabled={regSubmitting} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
              {regError && <p className="m-0 text-[0.8rem] text-red-700">{regError}</p>}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="mt-4 flex flex-col gap-4 md:mt-6 md:gap-6">
      {/* Today — punch card */}
      <section className={cardClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Today</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 md:text-lg">{formatDateLong(today)}</div>
            <div className="mt-0.5 truncate text-[0.8rem] text-slate-500">
              {data.name} · <span className="font-mono">{data.employeeCode}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 md:text-3xl">{formatClock(now)}</div>
            {shiftRules && <div className="mt-0.5 text-[0.7rem] text-slate-400 md:text-xs">Shift {shiftRules.shiftStartTime}–{shiftRules.shiftEndTime}</div>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-solid border-slate-200 bg-white p-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Punch In</div>
            <div className={`mt-1 text-lg font-bold tabular-nums ${todayIn ? 'text-slate-900' : 'text-slate-300'}`}>{todayIn || '—'}</div>
          </div>
          <div className="rounded-lg border border-solid border-slate-200 bg-white p-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Punch Out</div>
            <div className={`mt-1 text-lg font-bold tabular-nums ${todayOut ? 'text-slate-900' : 'text-slate-300'}`}>{todayOut || '—'}</div>
          </div>
        </div>

        {(todayBucket || todayHoliday) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {todayHoliday && <span className={`rounded-full border border-solid px-2.5 py-1 text-xs font-semibold ${HOLIDAY_TONE}`}>Holiday — {todayHoliday}</span>}
            {todayBucket && (
              <span className={`rounded-full border border-solid px-2.5 py-1 text-xs font-semibold ${BUCKET_TONE[todayBucket]}`}>
                {todayBucket === 'on-time' ? '✓ ' : '⚠ '}{BUCKET_LABEL[todayBucket]}
              </span>
            )}
          </div>
        )}

        {todayIn && todayOut ? (
          <p className="m-0 mt-4 rounded-lg bg-green-50 px-3 py-3 text-center text-sm font-semibold text-green-800">✓ You&apos;re done for today</p>
        ) : (
          <div className={`mt-4 grid gap-2 sm:gap-3 ${!todayIn && !todayOut ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:max-w-xs'}`}>
            {!todayIn && (
              <button type="button" onClick={() => punch('in')} disabled={punching !== null} className={`${actionButtonClass} min-h-12 w-full bg-gradient-to-br from-green-500 to-green-600 text-base shadow-sm`}>
                ⏱ {punchLabel('in')}
              </button>
            )}
            {!todayOut && (
              <button
                type="button"
                onClick={() => punch('out')}
                disabled={punching !== null}
                className={todayIn
                  ? `${actionButtonClass} min-h-12 w-full bg-gradient-to-br from-red-400 to-red-500 text-base shadow-sm`
                  : `${secondaryButtonClass} min-h-12 w-full text-base text-red-600`}
              >
                ⏱ {punchLabel('out')}
              </button>
            )}
          </div>
        )}

        {data.geofence?.enabled && (
          <p className="m-0 mt-3 text-xs text-slate-400">
            📍 Punch In / Punch Out only within {data.geofence.radiusM} m of the office — your browser will ask for your location.
          </p>
        )}
        {note && <p className="m-0 mt-3 text-sm text-amber-700">{note}</p>}
        {error && <p className="m-0 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {error && errorHint && <p className="m-0 mt-1 text-[0.8rem] text-slate-500">{errorHint}</p>}

        {isSelectedToday && regularizationBlock}
      </section>

      {/* Selected-day details (any day other than today, picked from the calendar) */}
      {!isSelectedToday && (
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 text-[0.9375rem] font-semibold text-slate-700">{formatDateLong(selectedDate)}</h3>
            <button type="button" onClick={() => selectDate(today)} className="min-h-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-sm font-semibold text-indigo-600">
              Back to today
            </button>
          </div>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 rounded-lg border border-solid border-slate-200 bg-white p-3 md:col-span-1">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Date</dt>
              <dd className="m-0 mt-1 text-sm font-semibold text-slate-900">{selectedDate}</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-solid border-slate-200 bg-white p-3 md:col-span-1">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="m-0 mt-1 text-sm font-semibold text-slate-900">{rowStatus}</dd>
            </div>
            <div className="rounded-lg border border-solid border-slate-200 bg-white p-3">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Punch In</dt>
              <dd className="m-0 mt-1 text-sm font-semibold tabular-nums text-slate-900">{hasIn ? selectedRecord?.inTime : '—'}</dd>
            </div>
            <div className="rounded-lg border border-solid border-slate-200 bg-white p-3">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Punch Out</dt>
              <dd className="m-0 mt-1 text-sm font-semibold tabular-nums text-slate-900">{hasOut ? selectedRecord?.outTime : '—'}</dd>
            </div>
          </dl>
          {selectedBucket && (
            <span className={`mt-3 inline-block rounded-full border border-solid px-2.5 py-1 text-xs font-semibold ${BUCKET_TONE[selectedBucket]}`}>
              {selectedBucket === 'on-time' ? '✓ ' : '⚠ '}{BUCKET_LABEL[selectedBucket]}
            </span>
          )}
          {regularizationBlock}
        </section>
      )}

      {/* Month calendar */}
      <section className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => changeMonth(-1)} className={navButtonClass} aria-label="Previous month">‹</button>
          <h3 className="m-0 text-base font-semibold text-slate-900 md:text-[1.0625rem]">{monthLabel(calendarMonth)}</h3>
          <button
            type="button"
            onClick={() => canGoNext && changeMonth(1)}
            disabled={!canGoNext}
            aria-label="Next month"
            className={navButtonClass}
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="text-center text-[0.65rem] font-semibold uppercase text-slate-400 sm:text-xs">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`pad-${idx}`} />;
            const dateStr = `${calendarMonth}-${String(day).padStart(2, '0')}`;
            const rec = calendarMap.get(dateStr);
            const bucket = shiftRules ? combinedAttendanceBucket(rec?.inMinutes ?? null, rec?.outMinutes ?? null, shiftRules, false) : null;
            const isRegularized = regularizationByDate.has(dateStr);
            const holidayName = holidayMap.get(dateStr);
            // Regularization is the most actionable status, so it still wins if a request happens
            // to land on a holiday; otherwise a holiday must win over the plain attendance bucket,
            // since no punch on a non-working day would otherwise render as a false "Absent".
            const tone = isRegularized ? REG_TONE : holidayName ? HOLIDAY_TONE : bucket ? BUCKET_TONE[bucket] : 'bg-white border-slate-200 text-slate-700';
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => selectDate(dateStr)}
                title={holidayName}
                aria-pressed={isSelected}
                className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-solid p-0 text-sm sm:aspect-auto sm:min-h-[3.75rem] sm:p-1.5 sm:text-[0.9375rem] ${tone} ${isToday ? 'font-bold' : 'font-medium'} ${isSelected ? 'ring-2 ring-slate-700 ring-offset-1' : ''}`}
              >
                <span>{day}</span>
                {isToday && <span className="hidden text-[0.625rem] font-semibold sm:block">Today</span>}
                {!isToday && holidayName && <span className="hidden text-[0.625rem] font-semibold sm:block">Holiday</span>}
                {isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current sm:hidden" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:flex-wrap sm:gap-4">
          <LegendDot tone={HOLIDAY_TONE} label="Holiday" />
          <LegendDot tone={BUCKET_TONE['on-time']} label={BUCKET_LABEL['on-time']} />
          <LegendDot tone={BUCKET_TONE.grace} label={BUCKET_LABEL.grace} />
          <LegendDot tone={BUCKET_TONE['short-leave']} label={BUCKET_LABEL['short-leave']} />
          <LegendDot tone={BUCKET_TONE['half-day']} label={BUCKET_LABEL['half-day']} />
          <LegendDot tone={BUCKET_TONE.absent} label={BUCKET_LABEL.absent} />
          <LegendDot tone={REG_TONE} label="Regularization requested" />
        </div>
      </section>
    </div>
  );
}
