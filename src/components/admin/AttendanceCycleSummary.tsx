'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { lopBreakdown, shortLeaveRuleShort, type EmployeeCycleLedger, type LedgerTotals } from '@/modules/hr-tool/utils/day-ledger';

type LeaveCard = EmployeeCycleLedger['leave'][number];
interface CycleData {
  month: string; periodFrom: string; periodTo: string; totals: LedgerTotals; leave: LeaveCard[]; locked: boolean;
  payrollRun: boolean; shortLeaveQuota: number;
  regularizations: { pending: number; applied: number; approved: number; limitUsed: number; quota: number };
}

function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

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

/** "This pay cycle" card on the self-service attendance page — the employee's own days for one
 * pay cycle (e.g. 26 Aug – 25 Sep), from the same day ledger payroll pays by
 * (`${apiBase}/ledger`), so what they see here is what their payslip counts. Laid out tile for tile
 * like HR's attendance calendar (hr-tool/views/AttendanceCalendar.tsx) — same labels, order and
 * colours — so HR and the employee read the numbers the same way. Salary figures stay out. `refreshKey` changes
 * whenever the attendance page reloads (a punch, a regularization), triggering a re-fetch. */
export default function AttendanceCycleSummary({ apiBase, getHeaders, refreshKey }: { apiBase: string; getHeaders: () => HeadersInit; refreshKey: unknown }) {
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
        if (json.data && !currentKey) setCurrentKey(json.data.month);
      })
      .catch(() => { if (live) setError('Could not load this pay cycle.'); });
    return () => { live = false; };
  }, [apiBase, monthKey, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="m-0 text-sm text-red-700">{error}</p>;
  if (!data) return null;
  const t = data.totals;
  const reg = data.regularizations;
  const canGoNext = !!currentKey && data.month < currentKey;
  const isCurrent = !!currentKey && data.month === currentKey;
  // Everything that was judged (worked, paid leave, loss of pay) — week-offs and future days aside.
  const judged = t.presentDays + t.leaveDays + t.lopDays;
  const payrollNote = data.locked ? 'payroll frozen (final)' : data.payrollRun ? 'payroll run as a draft' : isCurrent ? 'estimate so far' : 'payroll not run yet';

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
        {data.leave.map((l) => {
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
      <p className="m-0 mt-3 text-xs leading-relaxed text-slate-500">
        A working day with no punch-in, or a punch-in with no punch-out, is absent. A day without an approved leave request is absent (loss of pay) even if you have Casual leave left — apply for leave to use it. A day you punched in on can only take half-day leave.
        Changes HR approves (regularizations, leave) show up here straight away.
      </p>
    </div>
  );
}
