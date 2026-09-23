'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import { ApprovalBadge, applyApprovalDecision, employeeName, scopedApprovals, todayStr } from '../utils';

export default function Leave() {
  const { state, persistLeaveRequests } = useHrTool();
  const lockedToSelf = state.role === 'Employee' || state.role === 'Reporting Manager';
  const enabledTypes = Object.entries(state.rules.leaveTypes).filter(([, cfg]) => cfg.enabled).map(([k]) => k);

  const [applyOpen, setApplyOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState('');
  const [typeOther, setTypeOther] = useState('');
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [remarks, setRemarks] = useState('');

  const rows = scopedApprovals(state.leaveRequests, state.role, state.currentUser?.id, state.employees);

  function openApply() {
    setEmployeeId(lockedToSelf ? (state.currentUser?.id || '') : (state.employees.find((e) => e.status !== 'exited')?.id || ''));
    setType(enabledTypes[0] || '');
    setTypeOther('');
    setFrom(todayStr());
    setTo(todayStr());
    setRemarks('');
    setApplyOpen(true);
  }
  async function submit() {
    const finalType = type === '__other__' ? typeOther.trim() : type;
    if (!finalType) { alert('Please specify the leave type.'); return; }
    const target = lockedToSelf ? state.currentUser : state.employees.find((e) => e.id === employeeId);
    if (!target) { alert('Please choose the employee.'); return; }
    // Single approval step for every module now (see Rules → Approval chain): HR Head when the
    // toggle is on, Founder/admin when it's off. Leaving these on 'rm' would strand leave and
    // expense requests exactly the way attendance regularizations were stranded.
    const stage = 'hr';
    await persistLeaveRequests([{
      id: 'L-' + Date.now(), employeeId: target.id, emp: target.name, type: finalType, from: from || todayStr(), to: to || from || todayStr(),
      remarks, stage, status: 'pending', rmRemarks: '', hrRemarks: '',
    }, ...state.leaveRequests]);
    setApplyOpen(false);
  }
  async function decide(id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', decisionRemarks: string) {
    await persistLeaveRequests(state.leaveRequests.map((l) => (l.id === id ? applyApprovalDecision(l, level, decision, decisionRemarks, state.rules.twoLevelApproval.leave) : l)));
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Leave Management</h1><div className="page-sub">Requests, approvals, and live balances. {state.rules.twoLevelApproval.leave ? 'Manager approves first, then HR.' : 'HR approves directly.'}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 14 }}><button className="btn primary" onClick={openApply}>+ Apply for leave</button></div>
      <div className="card"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Remarks</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id}><td>{employeeName(state.employees, l.employeeId, l.emp)}</td><td>{l.type === 'WFH' ? <span className="badge active">Work From Home</span> : l.type}</td><td>{l.from}{l.to !== l.from ? ` – ${l.to}` : ''}</td><td>{l.remarks || '—'}</td><td><ApprovalBadge req={l} /></td>
              <td style={{ textAlign: 'right' }}><ApprovalCell req={l} onDecide={(level, decision, r) => decide(l.id, level, decision, r)} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6}><div className="empty">No leave requests.</div></td></tr>}
        </tbody>
      </table></div>
      <div className="footnote">Leave types currently enabled by HR: {enabledTypes.join(', ') || 'none'}. Configure this from Rules &amp; Org Structure.</div>

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
              <option value="__other__">Other (please specify)</option>
            </select>
          </div>
          {type === '__other__' && <div className="field"><label className="field-label">Please specify leave type</label><input type="text" placeholder="e.g. Bereavement leave" value={typeOther} onChange={(e) => setTypeOther(e.target.value)} /></div>}
          <div className="grid grid-2">
            <div className="field"><label className="field-label">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="field"><label className="field-label">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="field"><label className="field-label">Remarks (optional)</label><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </ModalShell>
      )}
    </>
  );
}
