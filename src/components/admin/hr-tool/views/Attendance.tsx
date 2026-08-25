'use client';

import { useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import { ApprovalBadge, StatusBadge, applyApprovalDecision, isAdmin, latenessBucket, latenessInfo, rmOf, scopedApprovals, todayStr } from '../utils';
import type { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

const REG_REASONS = ['Forgot to punch out', 'Forgot to punch in', 'System/network issue', 'Worked from a client site'];
const PANEL_ROLE_LABEL: Record<PanelAdminRole, string> = { event_admin: 'Event Admin', publisher_admin: 'Publisher Admin' };

function nowTimeStr(): string { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
function nowMinutesSinceMidnight(): number { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

export default function Attendance() {
  const { state, persistAttendance, persistPunch, persistRegularizations } = useHrTool();
  const [regOpen, setRegOpen] = useState(false);
  const [regDate, setRegDate] = useState(todayStr());
  const [regPunchType, setRegPunchType] = useState<'in' | 'out'>('in');
  const [regTime, setRegTime] = useState('');
  const [regReason, setRegReason] = useState(REG_REASONS[0]);
  const [regReasonOther, setRegReasonOther] = useState('');

  const isEmployeeOnly = state.role === 'Employee';
  const scopeFilter = isAdmin(state.role)
    ? () => true
    : state.role === 'Reporting Manager'
      ? (empName: string) => rmOf(state.employees, empName) === state.currentUser?.name || empName === state.currentUser?.name
      : (empName: string) => empName === state.currentUser?.name;
  const attRows = state.attendance.filter((a) => a.date === todayStr() && scopeFilter(a.emp));
  const regRows = scopedApprovals(state.regularizations, state.role, state.currentUser?.name, state.employees);
  const employeeCredentials = state.employeeCredentials;
  const credentialByName = useMemo(() => {
    const map = new Map<string, HrEmployeeCredential>();
    employeeCredentials.forEach((c) => map.set(c.name, c));
    return map;
  }, [employeeCredentials]);

  const myPunch = isEmployeeOnly && state.currentUser ? state.punchLog[state.currentUser.name] : null;
  const punchedInToday = !!(myPunch && myPunch.date === new Date().toISOString().slice(0, 10) && myPunch.inTime);
  const punchedOutToday = !!(myPunch && myPunch.date === new Date().toISOString().slice(0, 10) && myPunch.outTime);
  const myLateness = punchedInToday && myPunch ? latenessInfo(myPunch.inMinutes, state.rules) : null;

  async function syncAttendanceRecord(empName: string) {
    const punch = state.punchLog[empName];
    if (!punch) return;
    const rec = {
      emp: empName, date: todayStr(), status: 'Present', inTime: punch.inTime || '—', outTime: punch.outTime || '—',
      inMinutes: punch.inMinutes ?? null, outMinutes: punch.outMinutes ?? null,
    };
    await persistAttendance(rec);
  }

  async function punchIn() {
    const me = state.currentUser;
    if (!me) return;
    const existing = state.punchLog[me.name];
    if (existing && existing.date === new Date().toISOString().slice(0, 10) && existing.inTime) return;
    const time = nowTimeStr();
    const minutes = nowMinutesSinceMidnight();
    await persistPunch({
      emp: me.name, date: new Date().toISOString().slice(0, 10), inTime: time, inMinutes: minutes,
      outTime: existing?.outTime || null, outMinutes: existing?.outMinutes ?? null,
    });
    await syncAttendanceRecord(me.name);
    const lateness = latenessInfo(minutes, state.rules);
    alert(`Punched in at ${time} — ${lateness?.text}. Geolocation captured.`);
  }
  async function punchOut() {
    const me = state.currentUser;
    if (!me) return;
    const existing = state.punchLog[me.name];
    if (existing && existing.date === new Date().toISOString().slice(0, 10) && existing.outTime) return;
    const time = nowTimeStr();
    await persistPunch({
      emp: me.name, date: new Date().toISOString().slice(0, 10), inTime: existing?.inTime || null, inMinutes: existing?.inMinutes ?? null,
      outTime: time, outMinutes: nowMinutesSinceMidnight(),
    });
    await syncAttendanceRecord(me.name);
    alert(`Punched out at ${time}${existing?.inTime ? '.' : ' — no punch-in recorded today.'}`);
  }

  async function submitRegularization() {
    const reason = regReason === '__other__' ? regReasonOther.trim() : regReason;
    if (!reason) { alert('Please describe the reason.'); return; }
    const time = regTime.trim();
    if (!time) { alert('Please set the time being regularized.'); return; }
    const diff = Math.round((new Date(todayStr()).getTime() - new Date(regDate).getTime()) / 86400000);
    if (!state.rules.regularizationOverride && diff > state.rules.regularizationWindowDays) {
      alert(`This date is outside the ${state.rules.regularizationWindowDays}-day regularization window. Contact HR for an override.`);
      return;
    }
    if (!state.currentUser) return;
    const stage = state.rules.twoLevelApproval.attendance ? 'rm' : 'hr';
    await persistRegularizations([
      { id: 'R-' + Date.now(), emp: state.currentUser.name, date: regDate, punchType: regPunchType, requestedTime: time, reason, stage, status: 'pending', rmRemarks: '', hrRemarks: '' },
      ...state.regularizations,
    ]);
    setRegOpen(false);
  }
  async function decideReg(id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) {
    await persistRegularizations(state.regularizations.map((r) => (r.id === id ? applyApprovalDecision(r, level, decision, remarks, state.rules.twoLevelApproval.attendance) : r)));
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Attendance</h1><div className="page-sub">{isEmployeeOnly ? 'Your punches and regularization requests.' : "Punches and regularization requests, scoped to your view."}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      {isEmployeeOnly && (
        <div className="toolbar" style={{ justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, gap: 8 }}>
          <div style={{ color: 'var(--muted)', fontSize: 12.5, marginRight: 'auto' }}>
            Shift: {state.rules.shiftStartTime} – {state.rules.shiftEndTime} ({state.rules.shiftGraceMinutes} min grace) — set by HR
            {myLateness && <><br /><span style={{ fontWeight: 700, color: myLateness.late ? 'var(--red)' : 'var(--green)' }}>{myLateness.late ? '⚠ ' : '✓ '}{myLateness.text}</span></>}
          </div>
          <button className="btn primary" disabled={punchedInToday} onClick={punchIn}>⏱ Punch In{punchedInToday && myPunch ? ` — ${myPunch.inTime}` : ''}</button>
          <button className="btn primary" disabled={punchedOutToday} onClick={punchOut}>⏱ Punch Out{punchedOutToday && myPunch ? ` — ${myPunch.outTime}` : ''}</button>
        </div>
      )}
      <section className="block">
        <div className="block-head"><h2>Today — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
        <div className="card"><div className="table-scroll"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Role</th><th>Status</th><th>In</th><th>Out</th><th>Lateness</th></tr></thead>
          <tbody>
            {attRows.map((a) => {
              const cred = credentialByName.get(a.emp);
              const rowInMinutes = state.punchLog[a.emp]?.inMinutes ?? null;
              const rowBucket = latenessBucket(rowInMinutes, state.rules);
              const rowLateness = latenessInfo(rowInMinutes, state.rules);
              return (
                <tr key={a.emp}>
                  <td>{a.emp}</td>
                  <td>{cred ? <code>{cred.employeeCode}</code> : <span className="meta">—</span>}</td>
                  <td>{cred?.panelRole ? PANEL_ROLE_LABEL[cred.panelRole] : <span className="meta">—</span>}</td>
                  <td><StatusBadge status={a.status === 'Present' ? 'active' : 'pending'} /></td>
                  <td>{a.inTime}</td>
                  <td>{a.outTime}</td>
                  <td>
                    {rowBucket === null && <span className="meta">—</span>}
                    {rowBucket === 'on-time' && <span>On time</span>}
                    {rowBucket === 'grace' && <span style={{ fontWeight: 700, color: 'var(--orange)' }}>⚠ Within grace period</span>}
                    {rowBucket === 'short-leave' && <span style={{ fontWeight: 700, color: 'var(--orange)' }}>⚠ {rowLateness?.text}</span>}
                    {rowBucket === 'half-day' && <span style={{ fontWeight: 700, color: 'var(--red)' }}>⚠ {rowLateness?.text}</span>}
                    {rowBucket === 'absent' && <span style={{ fontWeight: 700, color: 'var(--red)' }}>⚠ {rowLateness?.text}</span>}
                  </td>
                </tr>
              );
            })}
            {attRows.length === 0 && <tr><td colSpan={7}><div className="empty">No attendance recorded yet today.</div></td></tr>}
          </tbody>
        </table></div></div>
      </section>
      <section className="block">
        <div className="block-head"><h2>Regularization requests</h2>
          {isEmployeeOnly && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm" onClick={() => { setRegDate(todayStr()); setRegPunchType('in'); setRegTime(''); setRegReason(REG_REASONS[0]); setRegReasonOther(''); setRegOpen(true); }}>+ Regularize Punch In</button>
              <button className="btn sm" onClick={() => { setRegDate(todayStr()); setRegPunchType('out'); setRegTime(''); setRegReason(REG_REASONS[0]); setRegReasonOther(''); setRegOpen(true); }}>+ Regularize Punch Out</button>
            </div>
          )}
        </div>
        <div className="meta" style={{ marginBottom: 10 }}>Window to request: within {state.rules.regularizationWindowDays} days of the attendance date. {state.rules.twoLevelApproval.attendance ? 'Manager approves first, then HR.' : 'HR approves directly (manager step off).'}</div>
        <div className="card"><div className="table-scroll wrap-table"><table>
          <colgroup>
            <col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '11%' }} /><col style={{ width: '33%' }} /><col style={{ width: '12%' }} /><col style={{ width: '10%' }} />
          </colgroup>
          <thead><tr><th>Employee</th><th>Date</th><th>Type</th><th>Requested Time</th><th>Reason</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {regRows.map((r) => (
              <tr key={r.id}><td>{r.emp}</td><td>{r.date}</td><td>{r.punchType === 'out' ? 'Punch Out' : 'Punch In'}</td><td>{r.requestedTime || '—'}</td><td>{r.reason}</td><td><ApprovalBadge req={r} /></td>
                <td style={{ textAlign: 'right' }}><ApprovalCell req={r} onDecide={(level, decision, remarks) => decideReg(r.id, level, decision, remarks)} /></td>
              </tr>
            ))}
            {regRows.length === 0 && <tr><td colSpan={7}><div className="empty">Nothing here.</div></td></tr>}
          </tbody>
        </table></div></div>
      </section>

      {regOpen && (
        <ModalShell title={`Regularize ${regPunchType === 'out' ? 'Punch Out' : 'Punch In'}`} onClose={() => setRegOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setRegOpen(false) },
          { label: 'Submit', cls: 'btn primary', onClick: submitRegularization },
        ]}>
          <div className="notice">Requests must be submitted within {state.rules.regularizationWindowDays} days of the attendance date.</div>
          <div className="field"><label className="field-label">Date</label><input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} /></div>
          <div className="field"><label className="field-label">{regPunchType === 'out' ? 'Punch Out' : 'Punch In'} time</label><input type="time" value={regTime} onChange={(e) => setRegTime(e.target.value)} /></div>
          <div className="field"><label className="field-label">Reason</label>
            <select value={regReason} onChange={(e) => setRegReason(e.target.value)}>
              {REG_REASONS.map((r) => <option key={r}>{r}</option>)}
              <option value="__other__">Other (please specify)</option>
            </select>
          </div>
          {regReason === '__other__' && <div className="field"><label className="field-label">Please specify</label><textarea placeholder="Describe the reason..." value={regReasonOther} onChange={(e) => setRegReasonOther(e.target.value)} /></div>}
        </ModalShell>
      )}
    </>
  );
}
