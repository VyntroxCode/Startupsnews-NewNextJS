'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import PunchOutTimeInput from '../../PunchOutTimeInput';
import { getAuthHeaders } from '@/lib/admin-auth';
import { ApprovalBadge, employeeName, isAdmin, todayStr } from '../utils';
import { ATTENDANCE_OVERRIDE_LABEL, ATTENDANCE_OVERRIDE_STATUSES, type HrAttendanceOverrideStatus } from '../types';
import { hrApi } from '../api';
import { payrollMonthKeyForDate, shiftMonthKey } from '@/modules/hr-tool/utils/time';
import { countedRegularizationDates } from '@/modules/hr-tool/utils/regularization-policy';
import { ABSENCE_COVER_TYPE } from '@/modules/hr-tool/utils/leave-balance';
import type { HrRegularization } from '@/modules/hr-tool/domain/types';
import { LEDGER_KIND_LABEL, lopBreakdown, shortLeaveRuleShort, shortLeaveDeductedPositions, type EmployeeCycleLedger, type LedgerDay, type LedgerDayKind } from '@/modules/hr-tool/utils/day-ledger';

const REG_REASONS = ['Forgot to punch out', 'Forgot to punch in', 'System/network issue', 'Worked from a client site'];

const DOWS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Plain-words label for each day kind, used in the day popup. */
const KIND_LABEL = LEDGER_KIND_LABEL;

/** What each HR-set status pays for the day (short leave: 1, or ½ when it's beyond the free quota). */
const HR_STATUS_PAY: Record<HrAttendanceOverrideStatus, number> = { present: 1, 'short-leave': 1, 'half-day': 0.5, absent: 0, 'unpaid-leave': 0, off: 1 };
/** The HR status a day already reads as — the dropdown's starting value. */
const HR_STATUS_FOR_KIND: Partial<Record<LedgerDayKind, HrAttendanceOverrideStatus>> = {
  present: 'present', settled: 'present', 'short-leave': 'short-leave', 'half-day': 'half-day', absent: 'absent', 'unpaid-leave': 'unpaid-leave', off: 'off',
};

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const ordinal = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;

/** Attendance calendar for one employee, one PAY CYCLE at a time (e.g. 26 Aug – 25 Sep) — never
 * into the future. Every square and every number comes from the server's day ledger
 * (HrToolService.getEmployeeCycleLedger → utils/day-ledger.ts), the exact code payroll pays by, so
 * the tiles here are that employee's payslip numbers for the cycle. It re-fetches whenever
 * attendance, a regularization or a leave changes in the HR tool, so an approval shows up at once. */
export default function AttendanceCalendar({ employeeId, initialMonth }: { employeeId: string; initialMonth?: string }) {
  const { state } = useHrTool();
  // The selected DATE — its day is read from the latest ledger, so the popup follows a re-fetch.
  const [selected, setSelected] = useState<string | null>(null);
  const currentCycle = useMemo(() => payrollMonthKeyForDate(todayStr(), state.rules), [state.rules]);
  // Opens on the cycle it was asked for (e.g. a past month picked in the overview), else today's.
  const [monthKey, setMonthKey] = useState(initialMonth && initialMonth <= currentCycle ? initialMonth : currentCycle);
  const [ledger, setLedger] = useState<EmployeeCycleLedger | null>(null);
  const [error, setError] = useState('');
  const [showRegList, setShowRegList] = useState(false);
  const canGoNext = monthKey < currentCycle;
  function goToCycle(delta: number) { setSelected(null); setShowRegList(false); setMonthKey((k) => shiftMonthKey(k, delta)); }

  useEffect(() => {
    let live = true;
    setError('');
    hrApi.getAttendanceLedger(employeeId, monthKey)
      .then((res) => { if (!live) return; if (res.success && res.data) setLedger(res.data); else setError(res.error || 'Could not load attendance.'); })
      .catch(() => { if (live) setError('Could not load attendance.'); });
    return () => { live = false; };
  }, [employeeId, monthKey, state.attendance, state.attendanceOverrides, state.regularizations, state.leaveRequests, state.rules, state.orgStructure.holidays]);

  const regsByDate = useMemo(() => {
    const map = new Map<string, { pending: boolean; approved: boolean }>();
    for (const r of state.regularizations) {
      if (r.employeeId !== employeeId) continue;
      const cur = map.get(r.date) || { pending: false, approved: false };
      if (r.status === 'pending') cur.pending = true;
      else if (r.stage === 'done' && r.status === 'approved') cur.approved = true;
      map.set(r.date, cur);
    }
    return map;
  }, [state.regularizations, employeeId]);

  // Raw punch times per date, shown on each square so HR doesn't have to open the day popup.
  const punchByDate = useMemo(() => {
    const map = new Map<string, { inTime: string; outTime: string }>();
    for (const a of state.attendance) if (a.employeeId === employeeId) map.set(a.date, { inTime: a.inTime, outTime: a.outTime });
    return map;
  }, [state.attendance, employeeId]);

  if (error) return <div className="notice bad">{error}</div>;
  if (!ledger || ledger.month !== monthKey) return <div className="footnote">Loading attendance…</div>;

  const t = ledger.totals;
  // The regularization tiles count only requests the EMPLOYEE applied for in this cycle (one per
  // date) — records converted from old direct HR edits are left out, exactly as the limit does.
  const appliedRegs = state.regularizations
    .filter((r) => r.employeeId === employeeId && r.source !== 'hr-edit' && r.date >= ledger.periodFrom && r.date <= ledger.periodTo)
    .sort((a, b) => a.date.localeCompare(b.date) || a.punchType.localeCompare(b.punchType));
  const appliedPendingDates = new Set(appliedRegs.filter((r) => r.status === 'pending').map((r) => r.date));
  const regPending = appliedPendingDates.size;
  // Counted in DAYS, like the limit: a punch-in and a punch-out fix on one date are one day.
  const regApplied = new Set(appliedRegs.map((r) => r.date)).size;
  const regApproved = new Set(appliedRegs.filter((r) => r.stage === 'done' && r.status === 'approved').map((r) => r.date)).size;
  const regLimitUsed = countedRegularizationDates(appliedRegs, ledger.periodFrom, ledger.periodTo).size;
  const regQuota = state.rules.regularizationMonthlyQuota;
  const cells: ReactNode[] = [];
  const firstDow = new Date(ledger.periodFrom + 'T00:00:00').getDay();
  for (let i = 0; i < firstDow; i++) cells.push(<div key={'b' + i} className="cal-cell blank" />);
  ledger.days.forEach((day, i) => {
    const reg = regsByDate.get(day.date);
    const dom = Number(day.date.slice(8, 10));
    const label = i === 0 || dom === 1 ? `${dom} ${new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}` : String(dom);
    const note = day.autoLeave ? `${day.kind === 'leave' ? '' : '½ '}auto ${ABSENCE_COVER_TYPE.toLowerCase()}`
      : day.kind === 'short-leave' && day.shortLeaveDeducted ? '½ deducted'
      : day.kind === 'half-leave' ? `½ leave${day.unpaidLeave > 0 ? ' (unpaid)' : ''}`
      : day.kind === 'unpaid-leave' ? 'unpaid' : null;
    const hrNote = day.hrSet ? `set by HR${day.kind === 'short-leave' && day.shortLeaveDeducted ? ' · ½ deducted' : ''}` : null;
    const punch = punchByDate.get(day.date);
    const punchIn = punch?.inTime && punch.inTime !== '—' ? punch.inTime : null;
    const punchOut = punch?.outTime && punch.outTime !== '—' ? punch.outTime : null;
    cells.push(
      <div key={day.date} className={`cal-cell ${day.kind}${day.hrSet ? ' hr-set' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSelected(day.date)}
        title={`${KIND_LABEL[day.kind]} — pays ${fmtNum(day.pay)} day`}>
        <div className="cal-day">{label}</div>
        {(punchIn || punchOut) && (
          <div className="cal-time">
            <div>In {punchIn || '—'}</div>
            <div>Out {punchOut || '—'}</div>
          </div>
        )}
        {(hrNote || note) && <div className="cal-note">{hrNote || note}</div>}
        {(reg?.pending || reg?.approved) && <span className={`cal-reg ${reg.pending ? 'pending' : 'approved'}`} aria-label={reg.pending ? 'Regularization pending' : 'Regularized'} />}
      </div>
    );
  });
  // Everything that was judged (worked, paid leave, loss of pay) — week-offs and future days aside.
  const judged = t.presentDays + t.leaveDays + t.lopDays;
  const selectedDay = selected ? ledger.days.find((d) => d.date === selected) || null : null;
  const isCurrent = monthKey === currentCycle;
  const payslipDiffers = !!ledger.saved && ledger.saved.monthlyGross !== ledger.pay.monthlyGross;

  return (
    <>
      <div className="cal-summary">
        <div className="cal-summary-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" className="btn ghost sm" onClick={() => goToCycle(-1)} aria-label="Previous pay cycle"><ChevronLeft size={14} aria-hidden /></button>
            <span className="cal-summary-month">{fmtDate(ledger.periodFrom)} – {fmtDate(ledger.periodTo)}</span>
            <button type="button" className="btn ghost sm" onClick={() => canGoNext && goToCycle(1)} disabled={!canGoNext} aria-label="Next pay cycle" style={{ opacity: canGoNext ? 1 : 0.4, cursor: canGoNext ? 'pointer' : 'not-allowed' }}><ChevronRight size={14} aria-hidden /></button>
          </div>
          <span className="cal-summary-note">
            Pay cycle{isCurrent ? ' (in progress)' : ''} · <strong>{fmtNum(t.paidDays)}</strong> of <strong>{t.totalDays}</strong> days paid
            {t.lopDays > 0 && <> · <strong>{fmtNum(t.lopDays)}</strong> LOP</>}
          </span>
        </div>
        {judged > 0 && (
          <div className="cal-summary-bar" role="img"
            aria-label={`${fmtNum(t.presentDays)} worked, ${fmtNum(t.leaveDays)} paid leave, ${fmtNum(t.lopDays)} loss of pay`}>
            {([['present', t.presentDays], ['leave', t.leaveDays], ['absent', t.lopDays]] as const)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => <span key={k} className={`seg ${k}`} style={{ width: `${(n / judged) * 100}%` }} />)}
          </div>
        )}
        <div className="cal-stats">
          <CalStat label="Days in cycle" value={t.totalDays} sub={`${t.workingDays} working`} tone="neutral" />
          <CalStat label="Present" value={t.presentDays} tone="present" />
          <CalStat label="Half day" value={t.halfDayDays} tone="half-day" />
          <CalStat label="Short leaves" value={t.shortLeaveDays}
            sub={`${shortLeaveRuleShort(state.rules.shortLeaveMonthlyQuota)}${t.shortLeaveDeductions > 0 ? ` · ${t.shortLeaveDeductions} deducted` : ''}`} tone="short-leave" />
          <CalStat label="Absent" value={t.absentDays} tone="absent" />
          <CalStat label="LOP days" value={t.lopDays} sub={t.lopDays > 0 ? lopBreakdown(t) : undefined} tone="absent" />
          <CalStat label="Week-offs" value={t.weekOffDays} sub="Sundays + holidays" tone="off" />
          <CalStat label="Paid days" value={t.paidDays} sub={t.futureDays ? `${t.futureDays} still to come` : undefined} tone="paid" />
          {ledger.leave.map((l) => <LeaveStat key={l.type} leave={l} isCurrent={isCurrent} />)}
          <CalStat label="Reg. pending" value={regPending} tone="regpending" onClick={() => setShowRegList(true)} />
          <CalStat label="Regularizations" value={regApplied} unit="applied" sub={`${regApproved} approved · limit used ${regLimitUsed} of ${regQuota}`} tone="regapproved" onClick={() => setShowRegList(true)} />
        </div>
        <div className="cal-payslip">
          Payslip for this cycle: <strong>{fmtNum(t.paidDays)} paid days</strong> · gross <strong>₹{ledger.pay.monthlyGross.toLocaleString('en-IN')}</strong>
          {ledger.paidInFnf && !ledger.saved ? ' · salary for this month is paid in the Full & Final, not by payroll'
            : ledger.saved ? (ledger.locked ? ' · payroll frozen (final)' : ' · payroll run as a draft') : isCurrent ? ' · estimate so far' : ' · payroll not run yet'}
          {payslipDiffers && <> · <strong>saved payslip ₹{ledger.saved!.monthlyGross.toLocaleString('en-IN')}</strong> ({ledger.locked ? 'frozen — final, cannot change' : 'draft — Run Payroll again to apply changes'})</>}
        </div>
        <div className="cal-summary-rule">
          {ledger.locked
            ? 'Payroll for this cycle is frozen and final — nothing in it can change.'
            : 'If anything changes for this cycle (attendance, leave or regularizations), run Payroll again so the payslip picks it up.'}
        </div>
      </div>
      <div className="cal-grid">
        {DOWS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells}
      </div>
      <div className="cal-legend">
        <span><span className="dot" style={{ background: 'var(--green-soft)', border: '1px solid #14532D' }} />Present</span>
        <span><span className="dot" style={{ background: '#FEF3C7', border: '1px solid #92400E' }} />Short leave</span>
        <span><span className="dot" style={{ background: '#FED7AA', border: '1px solid #9A3412' }} />Half day</span>
        <span><span className="dot" style={{ background: '#FECACA', border: '1px solid #7F1D1D' }} />Absent</span>
        <span><span className="dot" style={{ background: '#DBEAFE', border: '1px solid #1E3A8A' }} />Paid leave</span>
        <span><span className="dot" style={{ background: 'repeating-linear-gradient(135deg, #DBEAFE 0 3px, #FECACA 3px 6px)', border: '1px solid #7F1D1D' }} />Unpaid leave</span>
        <span><span className="dot" style={{ background: 'linear-gradient(135deg, #DBEAFE 50%, #FED7AA 50%)', border: '1px solid #1E3A8A' }} />Half-day leave</span>
        <span><span className="dot" style={{ background: '#F1F5F9', border: '1px solid var(--muted)' }} />Week-off</span>
        <span><span className="dot" style={{ background: '#F0FDF4', border: '1px dashed #166534' }} />Paid in earlier run</span>
        <span><span className="dot" style={{ background: '#EEF2F7', border: '1px solid #94A3B8' }} />Not employed</span>
        <span><span className="dot" style={{ background: '#D97706', borderRadius: '50%' }} />Regularization pending</span>
        <span><span className="dot" style={{ background: '#7C3AED', borderRadius: '50%' }} />Regularized</span>
        <span><span className="dot" style={{ background: '#fff', border: '2px solid #0F766E' }} />Set by HR</span>
      </div>
      {showRegList && (
        <RegularizationListModal regs={appliedRegs} periodFrom={ledger.periodFrom} periodTo={ledger.periodTo} used={regLimitUsed} quota={regQuota}
          onOpenDay={(date) => { setShowRegList(false); setSelected(date); }} onClose={() => setShowRegList(false)} />
      )}
      {selectedDay && (
        <DayDetailModal employeeId={employeeId} day={selectedDay} shortLeaveQuota={state.rules.shortLeaveMonthlyQuota}
          cycle={{ from: ledger.periodFrom, to: ledger.periodTo, locked: ledger.locked, draftRun: !!ledger.saved && !ledger.locked }}
          onClose={() => setSelected(null)} />
      )}
    </>
  );
}

/** One leave type's card: the balance left today (big number) out of the year's total so far,
 * and how much this cycle used — approved leave plus absences paid from it automatically — with
 * unpaid / waiting days only when there are any. Spans two tiles. */
function LeaveStat({ leave: l, isCurrent }: { leave: EmployeeCycleLedger['leave'][number]; isCurrent: boolean }) {
  const used = l.paidInCycle + l.autoInCycle;
  return (
    <div className="cal-stat leave wide">
      <div className="cal-stat-label">{l.type} leave</div>
      <div className="cal-stat-num">{fmtNum(l.available)} <span style={{ fontSize: 12, fontWeight: 600 }}>available</span></div>
      <div className="cal-stat-sub" style={{ fontWeight: 600 }}>
        {isCurrent ? 'This month' : 'In this month'}: {fmtNum(used)} used
        {l.autoInCycle > 0 && ` (${fmtNum(l.autoInCycle)} automatic, for absences / half days)`}
        {l.unpaidInCycle > 0 && ` · ${fmtNum(l.unpaidInCycle)} unpaid`}
        {l.pendingInCycle > 0 && ` · ${fmtNum(l.pendingInCycle)} waiting`}
      </div>
    </div>
  );
}

/** One number in the calendar's summary strip. `tone` maps to a `.cal-stat` colour variant that
 * matches the same status's colour in the grid below, so the tiles and the squares read as one
 * thing. Styling lives in HrToolApp's global block — Tailwind isn't compiled for /admin. */
function CalStat({ label, value, unit, sub, tone, onClick }: { label: string; value: number; unit?: string; sub?: string; tone: string; onClick?: () => void }) {
  const clickable = onClick ? {
    role: 'button' as const, tabIndex: 0, title: 'Click for details', style: { cursor: 'pointer' },
    onClick, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
  } : {};
  return (
    <div className={`cal-stat ${tone}`} {...clickable}>
      <div className="cal-stat-label">{label}</div>
      <div className="cal-stat-num">{value}{unit && <span style={{ fontSize: 12, fontWeight: 600 }}> {unit}</span>}</div>
      {sub && <div className="cal-stat-sub">{sub}</div>}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Closed (HR set the day)' };

/** Every regularization the employee applied for in this cycle (converted HR edits left out), so
 * HR can see what the "Reg. pending" / "Regularized" tiles are made of. A date opens its day popup,
 * where the request can be approved or rejected. */
function RegularizationListModal({ regs, periodFrom, periodTo, used, quota, onOpenDay, onClose }: {
  regs: HrRegularization[]; periodFrom: string; periodTo: string; used: number; quota: number;
  onOpenDay: (date: string) => void; onClose: () => void;
}) {
  return (
    <ModalShell title={`Regularization requests — ${fmtDate(periodFrom)} – ${fmtDate(periodTo)}`} onClose={onClose} maxWidth={820}
      actions={[{ label: 'Close', cls: 'btn', onClick: onClose }]}>
      <div className="footnote" style={{ marginBottom: 10 }}>
        <strong>{new Set(regs.map((r) => r.date)).size} applied · {new Set(regs.filter((r) => r.stage === 'done' && r.status === 'approved').map((r) => r.date)).size} approved</strong> (days). Limit used: <strong>{used} of {quota}</strong> days. Every request counts — pending, approved and rejected (punch-in and punch-out on one date are one day).
      </div>
      {regs.length === 0 ? <div className="footnote">No regularization requests applied in this cycle.</div> : (
        <table>
          <thead><tr><th>Date</th><th>Punch</th><th>Time asked</th><th>Reason</th><th>Status</th><th>Remarks</th></tr></thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id}>
                <td><button type="button" className="btn ghost sm" onClick={() => onOpenDay(r.date)} title="Open this day">{fmtDate(r.date)}</button></td>
                <td>{r.punchType === 'in' ? 'Punch in' : 'Punch out'}</td>
                <td>{r.requestedTime || '—'}</td>
                <td>{r.reason}</td>
                <td>{STATUS_LABEL[r.status] || r.status}</td>
                <td>{[r.rmRemarks && `Manager: ${r.rmRemarks}`, r.hrRemarks && `HR: ${r.hrRemarks}`].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalShell>
  );
}

function DayDetailModal({ employeeId, day, shortLeaveQuota, cycle, onClose }: {
  employeeId: string; day: LedgerDay; shortLeaveQuota: number;
  /** The pay cycle the day sits in — `draftRun`: payroll has been run as a draft (not frozen). */
  cycle: { from: string; to: string; locked: boolean; draftRun: boolean };
  onClose: () => void;
}) {
  const dateStr = day.date;
  const { state, decideRegularization, addRegularizationToState, setAttendanceOverride, clearAttendanceOverride } = useHrTool();
  const empName = employeeName(state.employees, employeeId);
  const [showRegForm, setShowRegForm] = useState<'in' | 'out' | null>(null);
  const [regTime, setRegTime] = useState('');
  const [regReason, setRegReason] = useState(REG_REASONS[0]);
  const [regReasonOther, setRegReasonOther] = useState('');
  // The popup stays open after each action (it used to close, hiding the result): this line says
  // what just happened, and the status / times / regularization badges above re-render from state.
  const [doneNote, setDoneNote] = useState('');
  // HR correction: HR Head / Founder set the day's status directly. Saving goes through a warning
  // popup first (it changes pay), then the server — payroll and both calendars follow.
  const hrSet = state.attendanceOverrides.find((o) => o.employeeId === employeeId && o.date === dateStr) || null;
  const [hrStatus, setHrStatus] = useState<HrAttendanceOverrideStatus>(hrSet?.status || HR_STATUS_FOR_KIND[day.kind] || 'present');
  const [hrReason, setHrReason] = useState('');
  const [hrError, setHrError] = useState('');
  const [confirm, setConfirm] = useState<'set' | 'clear' | null>(null);
  const [saving, setSaving] = useState(false);

  const real = state.attendance.find((a) => a.employeeId === employeeId && a.date === dateStr);
  const regIn = state.regularizations.find((r) => r.employeeId === employeeId && r.date === dateStr && r.punchType === 'in');
  const regOut = state.regularizations.find((r) => r.employeeId === employeeId && r.date === dateStr && r.punchType === 'out');
  // The day ledger's verdict — the same one payroll pays by — not the raw stored real.status,
  // which is always 'Present' from the moment of punch-in and never revisited.
  const detail = day.kind === 'absent' && day.inMinutes != null && day.outMinutes == null ? ' — no punch-out'
    : day.kind === 'short-leave' && day.shortLeaveDeducted ? ` — half a day deducted (the ${shortLeaveDeductedPositions(shortLeaveQuota).map(ordinal).join(', ')}… short leaves of a cycle cost ½ day)`
    : day.kind === 'half-leave' ? ` — ${fmtNum(day.paidLeave)} paid leave${day.unpaidLeave ? `, ${fmtNum(day.unpaidLeave)} unpaid` : ''}, ${fmtNum(day.worked)} worked`
    : '';
  // What an automatic Casual day actually was: a whole absence, a half day, or a short leave whose
  // deducted half was paid.
  const autoWhat = day.kind === 'half-leave' ? 'Half day' : day.kind === 'short-leave' ? 'Short leave' : 'Absent';
  const autoPart = day.kind === 'leave' ? '' : ` — the missing ${fmtNum(day.paidLeave)} day`;
  const statusLabel = day.autoLeave
    ? `${autoWhat}${autoPart} paid from ${ABSENCE_COVER_TYPE} leave automatically (no leave request) · pays ${fmtNum(day.pay)} day`
    : `${KIND_LABEL[day.kind]}${detail}${day.hrSet ? ' — set by HR' : ''} · pays ${fmtNum(day.pay)} day`;
  const currentLabel = day.autoLeave ? `${autoWhat} (paid from ${ABSENCE_COVER_TYPE} leave)` : `${KIND_LABEL[day.kind]}${day.hrSet ? ' (set by HR)' : ''}`;

  // Why HR can't set this day — the server refuses the same cases.
  const leaveOnDay = state.leaveRequests.find((l) => l.employeeId === employeeId && (l.status === 'approved' || l.status === 'pending') && l.from <= dateStr && l.to >= dateStr);
  const hrBlock = cycle.locked ? 'Payroll for this cycle is frozen and final — this day cannot be changed.'
    : day.kind === 'future' ? "This day hasn't happened yet — only past days and today can be set."
    : day.kind === 'not-employed' ? 'Not employed on this date.'
    : day.kind === 'settled' ? 'Already paid in an earlier payroll run — this day cannot be changed.'
    : day.kind === 'off' && !day.hrSet ? 'Sunday / company holiday — already a paid week-off.'
    : leaveOnDay ? `There is a ${leaveOnDay.status} ${leaveOnDay.type} leave request on this day — ${leaveOnDay.status === 'pending' ? 'reject' : 'cancel'} it in Leave first.`
    : null;
  const pendingRegOnDay = state.regularizations.some((r) => r.employeeId === employeeId && r.date === dateStr && r.status === 'pending');

  function openSetConfirm() {
    setHrError('');
    if (!hrReason.trim()) { setHrError('Please write the reason for this change.'); return; }
    if (hrSet && hrSet.status === hrStatus) { setHrError(`This day is already set to ${ATTENDANCE_OVERRIDE_LABEL[hrStatus]}.`); return; }
    setConfirm('set');
  }
  async function confirmHrChange() {
    if (saving || !confirm) return;
    setSaving(true);
    setHrError('');
    const res = confirm === 'set'
      ? await setAttendanceOverride(employeeId, dateStr, hrStatus, hrReason.trim())
      : await clearAttendanceOverride(employeeId, dateStr);
    setSaving(false);
    if (res.error) { setHrError(res.error); return; }
    const payrollNote = res.draftUpdated ? ' The draft payslip for this cycle was updated.' : '';
    setDoneNote(confirm === 'set' ? `Attendance set to ${ATTENDANCE_OVERRIDE_LABEL[hrStatus]}.${payrollNote}` : `HR status removed — the day is judged from punches and leave again.${payrollNote}`);
    setConfirm(null);
    setHrReason('');
  }
  const times = real ? { inTime: real.inTime, outTime: real.outTime } : { inTime: '—', outTime: '—' };

  async function submitRegularization() {
    if (!showRegForm) return;
    const reason = regReason === '__other__' ? regReasonOther.trim() : regReason;
    if (!reason) { alert('Please describe the reason.'); return; }
    const time = regTime.trim();
    if (!time) { alert('Please set the time being regularized.'); return; }
    // Goes through the server so the SAME rules apply here as on the employee portal: time
    // windows, 5-day window, cycle closing, per-cycle day limit, duplicate and on-time checks.
    const res = await fetch('/api/admin/hr-tool/regularizations', {
      method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, date: dateStr, reason, punchType: showRegForm, requestedTime: time }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) { alert(json?.error || 'Could not submit the regularization request.'); return; }
    addRegularizationToState(json.data);
    setShowRegForm(null);
    setRegTime('');
    setRegReasonOther('');
    setDoneNote('Regularization request submitted.');
  }
  async function decideReg(id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) {
    await decideRegularization(id, level, decision, remarks);
    setDoneNote(decision === 'approved' ? 'Regularization approved.' : 'Regularization rejected.');
  }

  if (confirm) {
    const newPay = HR_STATUS_PAY[hrStatus];
    return (
      <ModalShell title="Warning — this changes payroll" onClose={() => { if (!saving) setConfirm(null); }} maxWidth={560}
        actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => { if (!saving) setConfirm(null); } },
          { label: saving ? 'Saving…' : confirm === 'set' ? 'Yes, change attendance' : 'Yes, remove HR status', cls: 'btn primary', onClick: confirmHrChange },
        ]}>
        <div className="notice">
          <TriangleAlert size={18} aria-hidden style={{ flexShrink: 0 }} />
          <div>
            <strong>This change affects {empName}&apos;s salary.</strong>{' '}
            {confirm === 'set'
              ? <>You are changing their attendance on <strong>{fmtDate(dateStr)}</strong> from <strong>{currentLabel}</strong> to <strong>{ATTENDANCE_OVERRIDE_LABEL[hrStatus]}</strong>.</>
              : <>You are removing the HR-set status on <strong>{fmtDate(dateStr)}</strong>. The day goes back to being judged from the punches and leave.</>}
          </div>
        </div>
        <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {confirm === 'set' && (
            <li>Pay for this day: <strong>{fmtNum(day.pay)}</strong> day → <strong>{fmtNum(newPay)}</strong> day
              {hrStatus === 'short-leave' && ` (½ day if it is the ${shortLeaveDeductedPositions(shortLeaveQuota).map(ordinal).join(', ')}… short leave this cycle)`}.</li>
          )}
          <li>Paid days, loss-of-pay days and gross salary for the <strong>{fmtDate(cycle.from)} – {fmtDate(cycle.to)}</strong> pay cycle are recalculated straight away.</li>
          <li>{cycle.draftRun
            ? <>Payroll for this cycle has already been run as a draft — {empName}&apos;s draft payslip will be <strong>updated automatically</strong>.</>
            : 'Payroll for this cycle has not been run yet — the new figures will be used when it is.'}</li>
          {confirm === 'set' && pendingRegOnDay && <li>The pending regularization request for this day will be <strong>closed</strong> (it won&apos;t count toward the employee&apos;s limit).</li>}
          {confirm === 'set' && <li>{empName} will see this day as <strong>Set by HR</strong> on their attendance calendar, with your reason.</li>}
          <li>The change is saved in the audit log under your name.</li>
        </ul>
        {confirm === 'set' && <div className="field"><label className="field-label">Reason</label>{hrReason.trim()}</div>}
        {hrError && <div className="notice bad">{hrError}</div>}
      </ModalShell>
    );
  }

  return (
    <ModalShell title={`${empName} — ${new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`} onClose={onClose} actions={[{ label: 'Close', cls: 'btn', onClick: onClose }]}>
      {doneNote && <div className="notice good">{doneNote}</div>}
      <div className="field"><label className="field-label">Status</label>{statusLabel}</div>
      <div className="field"><label className="field-label">In / Out</label>{times.inTime} – {times.outTime}</div>
      {(regIn || regOut) && (
        <div className="field"><label className="field-label">Regularization</label>
          {regIn && (
            <div style={{ marginBottom: 8 }}>
              Punch In ({regIn.requestedTime}): {regIn.reason} — <ApprovalBadge req={regIn} />
              {regIn.source === 'hr-edit' && <div className="meta">Converted from an old direct HR edit — not counted in the limit.</div>}
              {regIn.rmRemarks && <div className="meta">Manager remarks: {regIn.rmRemarks}</div>}
              {regIn.hrRemarks && <div className="meta">HR remarks: {regIn.hrRemarks}</div>}
              <div style={{ marginTop: 8 }}><ApprovalCell req={regIn} onDecide={(level, decision, remarks) => decideReg(regIn.id, level, decision, remarks)} /></div>
            </div>
          )}
          {regOut && (
            <div>
              Punch Out ({regOut.requestedTime}): {regOut.reason} — <ApprovalBadge req={regOut} />
              {regOut.source === 'hr-edit' && <div className="meta">Converted from an old direct HR edit — not counted in the limit.</div>}
              {regOut.rmRemarks && <div className="meta">Manager remarks: {regOut.rmRemarks}</div>}
              {regOut.hrRemarks && <div className="meta">HR remarks: {regOut.hrRemarks}</div>}
              <div style={{ marginTop: 8 }}><ApprovalCell req={regOut} onDecide={(level, decision, remarks) => decideReg(regOut.id, level, decision, remarks)} /></div>
            </div>
          )}
        </div>
      )}
      {(!regIn || !regOut) && employeeId === state.currentUser?.id && !showRegForm && (
        <div className="field" style={{ display: 'flex', gap: 8 }}>
          {!regIn && <button className="btn sm" onClick={() => { setShowRegForm('in'); setRegTime(''); }}>+ Regularize Punch In</button>}
          {!regOut && <button className="btn sm" onClick={() => { setShowRegForm('out'); setRegTime(''); }}>+ Regularize Punch Out</button>}
        </div>
      )}
      {showRegForm && (
        <div className="field">
          <label className="field-label">{showRegForm === 'out' ? 'Punch Out' : 'Punch In'} time</label>
          {showRegForm === 'out'
            ? <div><PunchOutTimeInput value={regTime} onChange={setRegTime} from={state.rules.punchOutFrom} to={state.rules.punchOutTo} selectStyle={{ width: 'auto' }} /></div>
            : <input type="time" min={state.rules.punchInFrom} max={state.rules.punchInTo} value={regTime} onChange={(e) => setRegTime(e.target.value)} />}
          <label className="field-label" style={{ marginTop: 8 }}>Reason</label>
          <select value={regReason} onChange={(e) => setRegReason(e.target.value)}>
            {REG_REASONS.map((r) => <option key={r}>{r}</option>)}
            <option value="__other__">Other (please specify)</option>
          </select>
          {regReason === '__other__' && <textarea style={{ marginTop: 8 }} placeholder="Describe the reason..." value={regReasonOther} onChange={(e) => setRegReasonOther(e.target.value)} />}
          <button className="btn primary sm" style={{ marginTop: 8 }} onClick={submitRegularization}>Submit</button>
        </div>
      )}
      {isAdmin(state.role) && (
        <div className="field">
          <label className="field-label">HR correction</label>
          {hrSet && (
            <div className="meta" style={{ marginBottom: 8 }}>
              Set by HR to <strong>{ATTENDANCE_OVERRIDE_LABEL[hrSet.status]}</strong>{hrSet.setBy && ` by ${hrSet.setBy}`}{hrSet.setAt && ` on ${hrSet.setAt.slice(0, 16)}`} — “{hrSet.reason}”
            </div>
          )}
          {hrBlock ? <div className="meta">{hrBlock}</div> : (
            <>
              <select value={hrStatus} onChange={(e) => setHrStatus(e.target.value as HrAttendanceOverrideStatus)}>
                {ATTENDANCE_OVERRIDE_STATUSES.map((s) => <option key={s} value={s}>{ATTENDANCE_OVERRIDE_LABEL[s]}</option>)}
              </select>
              <textarea style={{ marginTop: 8 }} placeholder="Reason (required) — e.g. Was at a client meeting, confirmed by the manager"
                value={hrReason} onChange={(e) => setHrReason(e.target.value)} />
              {hrError && <div className="notice bad" style={{ marginTop: 8, marginBottom: 0 }}>{hrError}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn primary sm" onClick={openSetConfirm}>Save correction</button>
                {hrSet && <button className="btn sm" onClick={() => { setHrError(''); setConfirm('clear'); }}>Remove HR status</button>}
              </div>
              <div className="meta" style={{ marginTop: 6 }}>Changes this employee&apos;s paid days and salary for the pay cycle.</div>
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
}
