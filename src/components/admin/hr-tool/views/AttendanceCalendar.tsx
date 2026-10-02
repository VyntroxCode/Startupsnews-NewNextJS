'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import PunchOutTimeInput from '../../PunchOutTimeInput';
import { getAuthHeaders } from '@/lib/admin-auth';
import { ApprovalBadge, employeeName, todayStr } from '../utils';
import { hrApi } from '../api';
import { payrollMonthKeyForDate, shiftMonthKey } from '@/modules/hr-tool/utils/time';
import type { EmployeeCycleLedger, LedgerDay, LedgerDayKind } from '@/modules/hr-tool/utils/day-ledger';

const REG_REASONS = ['Forgot to punch out', 'Forgot to punch in', 'System/network issue', 'Worked from a client site'];

const DOWS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Plain-words label for each day kind, used in the day popup. */
const KIND_LABEL: Record<LedgerDayKind, string> = {
  present: 'Present', 'short-leave': 'Short leave', 'half-day': 'Half day', absent: 'Absent',
  leave: 'On leave (paid)', 'unpaid-leave': 'On leave — unpaid (no balance left)', 'half-leave': 'Half-day leave',
  off: 'Week-off / holiday', future: 'Not due yet', 'not-employed': 'Not employed on this date', settled: 'Already paid in an earlier payroll run',
};

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

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
  const canGoNext = monthKey < currentCycle;
  function goToCycle(delta: number) { setSelected(null); setMonthKey((k) => shiftMonthKey(k, delta)); }

  useEffect(() => {
    let live = true;
    setError('');
    hrApi.getAttendanceLedger(employeeId, monthKey)
      .then((res) => { if (!live) return; if (res.success && res.data) setLedger(res.data); else setError(res.error || 'Could not load attendance.'); })
      .catch(() => { if (live) setError('Could not load attendance.'); });
    return () => { live = false; };
  }, [employeeId, monthKey, state.attendance, state.regularizations, state.leaveRequests, state.rules, state.orgStructure.holidays]);

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

  if (error) return <div className="notice bad">{error}</div>;
  if (!ledger || ledger.month !== monthKey) return <div className="footnote">Loading attendance…</div>;

  const t = ledger.totals;
  let regPending = 0, regApproved = 0;
  const cells: ReactNode[] = [];
  const firstDow = new Date(ledger.periodFrom + 'T00:00:00').getDay();
  for (let i = 0; i < firstDow; i++) cells.push(<div key={'b' + i} className="cal-cell blank" />);
  ledger.days.forEach((day, i) => {
    const reg = regsByDate.get(day.date);
    if (reg?.pending) regPending++; else if (reg?.approved) regApproved++;
    const dom = Number(day.date.slice(8, 10));
    const label = i === 0 || dom === 1 ? `${dom} ${new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}` : String(dom);
    const note = day.kind === 'short-leave' && day.shortLeaveDeducted ? '½ deducted'
      : day.kind === 'half-leave' ? `½ leave${day.unpaidLeave > 0 ? ' (unpaid)' : ''}`
      : day.kind === 'unpaid-leave' ? 'unpaid' : null;
    cells.push(
      <div key={day.date} className={`cal-cell ${day.kind}`} style={{ cursor: 'pointer' }} onClick={() => setSelected(day.date)}
        title={`${KIND_LABEL[day.kind]} — pays ${fmtNum(day.pay)} day`}>
        <div className="cal-day">{label}</div>
        {note && <div className="cal-note">{note}</div>}
        {reg && <span className={`cal-reg ${reg.pending ? 'pending' : 'approved'}`} aria-label={reg.pending ? 'Regularization pending' : 'Regularized'} />}
      </div>
    );
  });
  // Everything that was judged (worked, paid leave, loss of pay) — week-offs and future days aside.
  const judged = t.presentDays + t.leaveDays + t.lopDays;
  const settledDays = ledger.days.filter((d) => d.kind === 'settled').length;
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
          <CalStat label="Present" value={t.presentDays} sub={t.halfDayDays || t.shortLeaveDeductions ? 'paid worth of days worked' : undefined} tone="present" />
          <CalStat label="Half day" value={t.halfDayDays} sub="½ day each" tone="half-day" />
          <CalStat label="Total short leaves" value={t.shortLeaveDays}
            sub={t.shortLeaveDeductions > 0 ? `${state.rules.shortLeaveMonthlyQuota} free · ${t.shortLeaveDeductions} cost ½ day` : `${state.rules.shortLeaveMonthlyQuota} free per month`} tone="short-leave" />
          {ledger.leave.map((l) => <LeaveStat key={l.type} leave={l} isCurrent={isCurrent} />)}
          <CalStat label="Absent / LOP" value={t.lopDays} sub={t.notEmployedDays ? `incl. ${t.notEmployedDays} not employed` : undefined} tone="absent" />
          <CalStat label="Week-offs" value={t.weekOffDays} sub="Sundays + holidays" tone="off" />
          <CalStat label="Paid days" value={t.paidDays} sub={t.futureDays ? `${t.futureDays} still to come` : undefined} tone="paid" />
          <CalStat label="Reg. pending" value={regPending} tone="regpending" />
          <CalStat label="Regularized" value={regApproved} tone="regapproved" />
        </div>
        <div className="cal-payslip">
          Payslip for this cycle: <strong>{fmtNum(t.paidDays)} paid days</strong> · gross <strong>₹{ledger.pay.monthlyGross.toLocaleString('en-IN')}</strong>
          {ledger.paidInFnf && !ledger.saved ? ' · salary for this month is paid in the Full & Final, not by payroll'
            : ledger.saved ? (ledger.locked ? ' · payroll locked' : ' · payroll run — updates automatically until it locks') : isCurrent ? ' · estimate so far' : ' · payroll not run yet'}
          {payslipDiffers && <> · <strong>saved payslip ₹{ledger.saved!.monthlyGross.toLocaleString('en-IN')}</strong> (locked — the Founder must reopen it to apply changes)</>}
        </div>
        <div className="cal-summary-rule">
          These are the same numbers payroll pays by. A working day with no punch-in, or a punch-in with no
          punch-out, is absent. Hours credited toward a full/half/short day cap at shift end ({state.rules.shiftEndTime}).
          A day with a punch-in can only take half-day leave.
          {settledDays > 0 && ` ${settledDays} day${settledDays === 1 ? ' was' : 's were'} already paid in the previous payroll run and count${settledDays === 1 ? 's' : ''} as present.`}
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
      </div>
      <div className="footnote">Click any day for details. A day can only be corrected through a regularization request — HR approves or rejects it.</div>
      {selectedDay && <DayDetailModal employeeId={employeeId} day={selectedDay} shortLeaveQuota={state.rules.shortLeaveMonthlyQuota} onClose={() => setSelected(null)} />}
    </>
  );
}

/** One leave type's card: the balance left today (big number) out of what has been earned this
 * year, and this cycle's requested days — approved ones split into paid / unpaid exactly as payroll
 * pays them, plus any still waiting for approval. Spans two tiles. */
function LeaveStat({ leave: l, isCurrent }: { leave: EmployeeCycleLedger['leave'][number]; isCurrent: boolean }) {
  return (
    <div className="cal-stat leave" style={{ gridColumn: 'span 2' }}>
      <div className="cal-stat-label">{l.type} leave</div>
      <div className="cal-stat-num">{fmtNum(l.available)} <span style={{ fontSize: 12, fontWeight: 600 }}>available</span></div>
      <div className="cal-stat-sub">of {fmtNum(l.earnedThisYear)} earned this year</div>
      <div className="cal-stat-sub" style={{ marginTop: 6, fontWeight: 600 }}>
        {isCurrent ? 'This month' : 'In this month'}: {fmtNum(l.appliedInCycle)} applied
        {l.appliedInCycle > 0 && <> — {fmtNum(l.paidInCycle)} paid{l.unpaidInCycle > 0 ? ` · ${fmtNum(l.unpaidInCycle)} unpaid (no balance)` : ''}{l.pendingInCycle > 0 ? ` · ${fmtNum(l.pendingInCycle)} waiting` : ''}</>}
      </div>
    </div>
  );
}

/** One number in the calendar's summary strip. `tone` maps to a `.cal-stat` colour variant that
 * matches the same status's colour in the grid below, so the tiles and the squares read as one
 * thing. Styling lives in HrToolApp's global block — Tailwind isn't compiled for /admin. */
function CalStat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: string }) {
  return (
    <div className={`cal-stat ${tone}`}>
      <div className="cal-stat-label">{label}</div>
      <div className="cal-stat-num">{value}</div>
      <div className="cal-stat-sub">{sub || '\u00A0'}</div>
    </div>
  );
}

function DayDetailModal({ employeeId, day, shortLeaveQuota, onClose }: { employeeId: string; day: LedgerDay; shortLeaveQuota: number; onClose: () => void }) {
  const dateStr = day.date;
  const { state, decideRegularization, addRegularizationToState } = useHrTool();
  const empName = employeeName(state.employees, employeeId);
  const [showRegForm, setShowRegForm] = useState<'in' | 'out' | null>(null);
  const [regTime, setRegTime] = useState('');
  const [regReason, setRegReason] = useState(REG_REASONS[0]);
  const [regReasonOther, setRegReasonOther] = useState('');
  // The popup stays open after each action (it used to close, hiding the result): this line says
  // what just happened, and the status / times / regularization badges above re-render from state.
  const [doneNote, setDoneNote] = useState('');

  const real = state.attendance.find((a) => a.employeeId === employeeId && a.date === dateStr);
  const regIn = state.regularizations.find((r) => r.employeeId === employeeId && r.date === dateStr && r.punchType === 'in');
  const regOut = state.regularizations.find((r) => r.employeeId === employeeId && r.date === dateStr && r.punchType === 'out');
  // The day ledger's verdict — the same one payroll pays by — not the raw stored real.status,
  // which is always 'Present' from the moment of punch-in and never revisited.
  const detail = day.kind === 'absent' && day.inMinutes != null && day.outMinutes == null ? ' — no punch-out'
    : day.kind === 'short-leave' && day.shortLeaveDeducted ? ` — over the free ${shortLeaveQuota} this cycle, half a day deducted`
    : day.kind === 'half-leave' ? ` — ${fmtNum(day.paidLeave)} paid leave${day.unpaidLeave ? `, ${fmtNum(day.unpaidLeave)} unpaid` : ''}, ${fmtNum(day.worked)} worked`
    : '';
  const statusLabel = `${KIND_LABEL[day.kind]}${detail} · pays ${fmtNum(day.pay)} day`;
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
            ? <div><PunchOutTimeInput value={regTime} onChange={setRegTime} selectStyle={{ width: 'auto' }} /></div>
            : <input type="time" min="08:00" max="14:00" value={regTime} onChange={(e) => setRegTime(e.target.value)} />}
          <label className="field-label" style={{ marginTop: 8 }}>Reason</label>
          <select value={regReason} onChange={(e) => setRegReason(e.target.value)}>
            {REG_REASONS.map((r) => <option key={r}>{r}</option>)}
            <option value="__other__">Other (please specify)</option>
          </select>
          {regReason === '__other__' && <textarea style={{ marginTop: 8 }} placeholder="Describe the reason..." value={regReasonOther} onChange={(e) => setRegReasonOther(e.target.value)} />}
          <button className="btn primary sm" style={{ marginTop: 8 }} onClick={submitRegularization}>Submit</button>
        </div>
      )}
    </ModalShell>
  );
}
