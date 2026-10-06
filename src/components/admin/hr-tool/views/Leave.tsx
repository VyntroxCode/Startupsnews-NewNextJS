'use client';

import { useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import { hrApi } from '../api';
import { ApprovalBadge, employeeName, isAdmin, scopedApprovals, todayStr } from '../utils';
import { allocateLeave, leaveCreditDay, absenceCoverThrough, punchedShortfall, type LeaveAllocation } from '@/modules/hr-tool/utils/leave-balance';

const HALF_LABEL: Record<string, string> = { first: 'First half', second: 'Second half' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "13 Oct 2026", "12 – 16 Oct 2026", "25 Sep – 2 Oct 2026" — the year only once when shared. */
function fmtLeaveDates(from: string, to: string): string {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  if (!fy || !ty) return to && to !== from ? `${from} – ${to}` : from;
  if (from === to) return `${fd} ${MONTHS[fm - 1]} ${fy}`;
  if (fy !== ty) return `${fd} ${MONTHS[fm - 1]} ${fy} – ${td} ${MONTHS[tm - 1]} ${ty}`;
  if (fm !== tm) return `${fd} ${MONTHS[fm - 1]} – ${td} ${MONTHS[tm - 1]} ${ty}`;
  return `${fd} – ${td} ${MONTHS[tm - 1]} ${ty}`;
}
const fmtDays = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} day${n === 1 ? '' : 's'}`;

export default function Leave() {
  const { state, upsertLeaveRequestInState } = useHrTool();
  const lockedToSelf = state.role === 'Employee' || state.role === 'Reporting Manager';
  const enabledTypes = Object.entries(state.rules.leaveTypes).filter(([, cfg]) => cfg.enabled).map(([k]) => k);

  const [applyOpen, setApplyOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [halfDay, setHalfDay] = useState<'' | 'first' | 'second'>('');
  const [remarks, setRemarks] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  const rows = scopedApprovals(state.leaveRequests, state.role, state.currentUser?.id, state.employees);
  const holidayDates = useMemo(() => state.orgStructure.holidays.map((h) => h.date), [state.orgStructure.holidays]);

  // Paid/unpaid split per request — the same allocateLeave payroll pays by, per employee.
  const splitById = useMemo(() => {
    const out = new Map<string, LeaveAllocation>();
    const today = todayStr();
    for (const e of state.employees) {
      const mine = state.leaveRequests.filter((l) => l.employeeId === e.id);
      if (mine.length === 0) continue;
      const attendance = state.attendance.filter((a) => a.employeeId === e.id);
      const worked = attendance.filter((a) => a.inMinutes != null).map((a) => a.date);
      const overrides = state.attendanceOverrides.filter((o) => o.employeeId === e.id);
      const through = absenceCoverThrough(today);
      const shortfall = punchedShortfall({ doj: e.doj, attendance, overrides, requests: mine, holidayDates, rules: state.rules, through });
      allocateLeave(e.doj, state.rules.leaveTypes, leaveCreditDay(state.rules), mine, today, holidayDates, worked, { through, skip: overrides.map((o) => o.date), shortfall }).forEach((v, k) => out.set(k, v));
    }
    return out;
  }, [state.employees, state.leaveRequests, state.attendance, state.attendanceOverrides, state.rules, holidayDates]);

  function openApply() {
    setEmployeeId(lockedToSelf ? (state.currentUser?.id || '') : (state.employees.find((e) => e.status !== 'exited')?.id || ''));
    setType(enabledTypes[0] || '');
    setFrom(todayStr());
    setTo(todayStr());
    setHalfDay('');
    setRemarks('');
    setApplyOpen(true);
  }
  async function submit() {
    const target = lockedToSelf ? state.currentUser : state.employees.find((e) => e.id === employeeId);
    if (!target) { alert('Please choose the employee.'); return; }
    if (!type) { alert('No leave type is switched on — enable one under Rules & Org Structure.'); return; }
    if (!remarks.trim()) { alert('Please add the reason.'); return; }
    // Same server rules as the employee portal — this screen used to write the whole leave list
    // straight from the browser with no checks at all.
    const res = await hrApi.submitLeaveRequest({ employeeId: target.id, type, from, to: halfDay ? from : to, reason: remarks.trim(), halfDay: halfDay || null });
    if (!res.success || !res.data) { alert(res.error || 'Could not submit the leave request.'); return; }
    upsertLeaveRequestInState(res.data.created);
    setApplyOpen(false);
    if (res.data.unpaidDays > 0) alert(`Submitted: ${res.data.paidDays} paid + ${res.data.unpaidDays} unpaid (not enough balance).`);
  }
  async function decide(id: string, decision: 'approved' | 'rejected', decisionRemarks: string) {
    const res = await hrApi.decideLeaveRequest(id, decision, decisionRemarks);
    if (!res.success || !res.data) { alert(res.error || 'Could not save the decision.'); return; }
    upsertLeaveRequestInState(res.data);
  }
  async function confirmCancel() {
    if (!cancelTarget) return;
    const res = await hrApi.cancelLeaveRequest(cancelTarget, cancelRemarks.trim());
    if (!res.success || !res.data) { alert(res.error || 'Could not cancel the leave.'); return; }
    upsertLeaveRequestInState(res.data);
    setCancelTarget(null);
  }

  // Only pending/approved requests hold balance, so only they have a paid/unpaid split.
  const splitOf = (id: string, status: string) => (status === 'pending' || status === 'approved' ? splitById.get(id) || null : null);
  const splitLabel = (s: LeaveAllocation | null) => {
    if (!s) return <span className="meta">—</span>;
    return (
      <span className="pay-chips">
        {(s.paid > 0 || s.unpaid === 0) && <span className="pay-chip paid">{s.paid} paid</span>}
        {s.unpaid > 0 && <span className="pay-chip unpaid">{s.unpaid} unpaid</span>}
      </span>
    );
  };

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Leave Management</h1><div className="page-sub">Requests, approvals, and live balances. HR approves, rejects or cancels — days beyond an employee&apos;s balance are unpaid.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 14 }}><button className="btn primary" onClick={openApply}>+ Apply for leave</button></div>
      <div className="card table-scroll">
        <table className="leave-table">
          <colgroup>
            <col style={{ width: '15%' }} /><col style={{ width: '12%' }} /><col style={{ width: '16%' }} /><col style={{ width: '13%' }} />
            <col /><col style={{ width: '11%' }} /><col style={{ width: '15%' }} />
          </colgroup>
          <thead><tr><th>Employee</th><th>Leave type</th><th>Dates</th><th>Paid / unpaid</th><th>Reason</th><th>Status</th><th className="col-action">Action</th></tr></thead>
          <tbody>
            {rows.map((l) => {
              const split = splitOf(l.id, l.status);
              const days = split ? split.paid + split.unpaid : null;
              const pendingDecision = l.status === 'pending';
              const canCancel = isAdmin(state.role) && l.status === 'approved';
              return (
                <tr key={l.id}>
                  <td className="who">{employeeName(state.employees, l.employeeId, l.emp)}</td>
                  <td>
                    {l.type === 'WFH' ? <span className="badge active">Work From Home</span> : l.type}
                    {l.halfDay && <div className="meta">{HALF_LABEL[l.halfDay]}</div>}
                  </td>
                  <td>
                    <div className="dates">{fmtLeaveDates(l.from, l.to)}</div>
                    {days != null && <div className="meta">{fmtDays(days)}</div>}
                  </td>
                  <td>{splitLabel(split)}</td>
                  <td className="reason">
                    <div>{l.remarks || '—'}</div>
                    {l.hrRemarks && l.status !== 'pending' && <div className="meta">HR: {l.hrRemarks}</div>}
                  </td>
                  <td><ApprovalBadge req={l} /></td>
                  <td className="col-action">
                    {pendingDecision && <ApprovalCell req={l} onDecide={(_level, decision, r) => decide(l.id, decision, r)} />}
                    {canCancel && <button className="btn sm" onClick={() => { setCancelTarget(l.id); setCancelRemarks(''); }}>Cancel leave</button>}
                    {!pendingDecision && !canCancel && <span className="meta">—</span>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7}><div className="empty">No leave requests.</div></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="footnote">Leave types currently enabled by HR: {enabledTypes.join(', ') || 'none'}. Configure this from Rules &amp; Org Structure. Sundays and holidays inside a leave aren&apos;t counted.</div>

      {applyOpen && (
        <ModalShell title="Apply for leave" onClose={() => setApplyOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setApplyOpen(false) },
          { label: 'Submit request', cls: 'btn primary', onClick: submit },
        ]}>
          <div className="field"><label className="field-label">Employee</label>
            {lockedToSelf ? <input type="text" value={state.currentUser?.name || ''} disabled /> : (
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {state.employees.filter((e) => e.status !== 'exited').map((e) => <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>)}
              </select>
            )}
          </div>
          <div className="field"><label className="field-label">Leave type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {enabledTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label">Duration</label>
            <select value={halfDay} onChange={(e) => { const v = e.target.value as '' | 'first' | 'second'; setHalfDay(v); if (v) setTo(from); }}>
              <option value="">Full day(s)</option>
              <option value="first">Half day — first half</option>
              <option value="second">Half day — second half</option>
            </select>
          </div>
          <div className="grid grid-2">
            <div className="field"><label className="field-label">From</label><input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (halfDay || to < e.target.value) setTo(e.target.value); }} /></div>
            <div className="field"><label className="field-label">To</label><input type="date" value={halfDay ? from : to} min={from} disabled={!!halfDay} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="field"><label className="field-label">Reason</label><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
          <div className="meta">Any date — past, today or future — except in a frozen payroll month. Days beyond the balance are unpaid. Full-day leave isn&apos;t allowed on a day with a punch-in.</div>
        </ModalShell>
      )}

      {cancelTarget && (
        <ModalShell title="Cancel approved leave" onClose={() => setCancelTarget(null)} actions={[
          { label: 'Keep leave', cls: 'btn', onClick: () => setCancelTarget(null) },
          { label: 'Cancel leave', cls: 'btn reject', onClick: confirmCancel },
        ]}>
          <div className="notice">The days go back to the employee&apos;s balance. If they didn&apos;t work those days, they will count as absent.</div>
          <div className="field"><label className="field-label">Reason (optional)</label><textarea value={cancelRemarks} onChange={(e) => setCancelRemarks(e.target.value)} /></div>
        </ModalShell>
      )}
    </>
  );
}
