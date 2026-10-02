'use client';

import { useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import { hrApi } from '../api';
import { ApprovalBadge, employeeName, isAdmin, scopedApprovals, todayStr } from '../utils';
import { allocateLeave, type LeaveAllocation } from '@/modules/hr-tool/utils/leave-balance';

const HALF_LABEL: Record<string, string> = { first: 'First half', second: 'Second half' };

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
      const worked = state.attendance.filter((a) => a.employeeId === e.id && a.inMinutes != null).map((a) => a.date);
      allocateLeave(e.doj, state.rules.leaveTypes, mine, today, holidayDates, worked).forEach((v, k) => out.set(k, v));
    }
    return out;
  }, [state.employees, state.leaveRequests, state.attendance, state.rules.leaveTypes, holidayDates]);

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

  const splitLabel = (id: string, status: string) => {
    if (status !== 'pending' && status !== 'approved') return '—';
    const s = splitById.get(id);
    if (!s) return '—';
    return s.unpaid > 0 ? <span>{s.paid} paid + <strong style={{ color: 'var(--red)' }}>{s.unpaid} unpaid</strong></span> : `${s.paid} paid`;
  };

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Leave Management</h1><div className="page-sub">Requests, approvals, and live balances. HR approves, rejects or cancels — days beyond an employee&apos;s balance are unpaid.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 14 }}><button className="btn primary" onClick={openApply}>+ Apply for leave</button></div>
      <div className="card"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Paid / unpaid</th><th>Remarks</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id}>
              <td>{employeeName(state.employees, l.employeeId, l.emp)}</td>
              <td>{l.type === 'WFH' ? <span className="badge active">Work From Home</span> : l.type}{l.halfDay ? ` · ${HALF_LABEL[l.halfDay]}` : ''}</td>
              <td>{l.from}{l.to !== l.from ? ` – ${l.to}` : ''}</td>
              <td>{splitLabel(l.id, l.status)}</td>
              <td>{l.remarks || '—'}{l.hrRemarks && l.status !== 'pending' && <div className="meta">{l.hrRemarks}</div>}</td>
              <td><ApprovalBadge req={l} /></td>
              <td style={{ textAlign: 'right' }}>
                <ApprovalCell req={l} onDecide={(_level, decision, r) => decide(l.id, decision, r)} />
                {isAdmin(state.role) && l.status === 'approved' && (
                  <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => { setCancelTarget(l.id); setCancelRemarks(''); }}>Cancel leave</button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7}><div className="empty">No leave requests.</div></td></tr>}
        </tbody>
      </table></div>
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
          <div className="meta">Today, yesterday or later. Days beyond the balance are unpaid. Full-day leave isn&apos;t allowed on a day with a punch-in.</div>
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
