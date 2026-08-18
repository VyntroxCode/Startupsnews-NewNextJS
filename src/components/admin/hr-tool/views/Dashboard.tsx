'use client';

import { useHrTool } from '../HrToolContext';
import { StatusBadge, ApprovalBadge, agreementMerged, initials, rmOf, STAGE_LABEL, todayStr, monthKeyToLabel } from '../utils';
import type { HrView } from '../types';

function StatTile({ label, num, note, view, onClick }: { label: string; num: string | number; note: string; view: HrView; onClick: (v: HrView) => void }) {
  return (
    <div className="card pad clickable" onClick={() => onClick(view)}>
      <div className="stat-label">{label}</div>
      <div className="stat-num">{num}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  const { state } = useHrTool();
  return (
    <div className="topbar">
      <div><h1 className="page-title">{title}</h1><div className="page-sub">{sub}</div></div>
      <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
    </div>
  );
}

export default function Dashboard() {
  const { state, setView } = useHrTool();
  if (state.role === 'Employee') return <EmployeeDashboard />;
  if (state.role === 'Reporting Manager') return <ManagerDashboard />;

  const active = state.employees.filter((e) => e.status === 'active').length;
  const probation = state.employees.filter((e) => e.status === 'probation');
  const pendingLeaveHR = state.leaveRequests.filter((l) => l.stage === 'hr' && l.status === 'pending').length;
  const pendingLeaveRM = state.leaveRequests.filter((l) => l.stage === 'rm' && l.status === 'pending').length;
  const pendingOnboard = state.onboarding.length;
  const pendingReg = state.regularizations.filter((r) => r.status === 'pending').length;
  const pendingExp = state.expenses.filter((x) => x.status === 'pending').length;

  return (
    <>
      <PageHead title="Dashboard" sub="A quick read on what needs your attention today. Every number below is clickable." />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatTile label="Active Employees" num={active} note={`${probation.length} on probation`} view="directory" onClick={setView} />
        <StatTile label="Pending Onboarding" num={pendingOnboard} note="awaiting document/agreement approval" view="onboarding" onClick={setView} />
        <StatTile label="Pending Regularizations" num={pendingReg} note="across manager + HR review" view="attendance" onClick={setView} />
        <StatTile label="Payroll Cycle" num={monthKeyToLabel(state.payrollRun.month)} note={state.payrollRun.status === 'not_run' ? 'not yet run' : 'completed'} view="payroll" onClick={setView} />
      </div>
      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <StatTile label="Leave — awaiting HR" num={pendingLeaveHR} note="RM-cleared, needs your action" view="leave" onClick={setView} />
        <StatTile label="Leave — awaiting Manager" num={pendingLeaveRM} note="not yet reached HR" view="leave" onClick={setView} />
        <StatTile label="Pending Expense Approvals" num={pendingExp} note="across manager + HR review" view="expenses" onClick={setView} />
        <StatTile label="Probation ending soon" num={probation.length} note="review confirmation" view="directory" onClick={setView} />
      </div>
      <section className="block">
        <div className="block-head"><h2>Upcoming compliance due dates</h2><button className="btn ghost sm" onClick={() => setView('compliance')}>View calendar →</button></div>
        <div className="card">
          <table><thead><tr><th>Task</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {state.compliance.slice(0, 4).map((c, i) => (
                <tr key={i}><td>{c.task}</td><td>{c.due}</td><td><StatusBadge status={c.status === 'upcoming' ? 'pending' : 'resolved'} /></td></tr>
              ))}
              {state.compliance.length === 0 && <tr><td colSpan={3}><div className="empty">No compliance tasks configured yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid grid-2">
        <section className="block">
          <div className="block-head"><h2>Onboarding queue</h2><button className="btn ghost sm" onClick={() => setView('onboarding')}>Open →</button></div>
          <div className="card pad">
            {state.onboarding.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="row-name"><div className="avatar">{initials(o.name)}</div><div><div>{o.name}</div><div className="meta">{o.designation}</div></div></div>
                <span className="badge pending">{STAGE_LABEL[o.stage] || o.stage}</span>
              </div>
            ))}
            {state.onboarding.length === 0 && <div className="empty">Nothing pending.</div>}
          </div>
        </section>
        <section className="block">
          <div className="block-head"><h2>Helpdesk tickets</h2><button className="btn ghost sm" onClick={() => setView('helpdesk')}>Open →</button></div>
          <div className="card pad">
            {state.tickets.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div><div>{t.emp}</div><div className="meta">{t.category}</div></div><StatusBadge status={t.status} />
              </div>
            ))}
            {state.tickets.length === 0 && <div className="empty">No tickets.</div>}
          </div>
        </section>
      </div>
    </>
  );
}

function ManagerDashboard() {
  const { state, setView } = useHrTool();
  const me = state.currentUser!;
  const team = state.employees.filter((e) => e.team === me.team && e.status !== 'exited');
  const myPendingLeave = state.leaveRequests.filter((l) => l.stage === 'rm' && l.status === 'pending' && rmOf(state.employees, l.emp) === me.name);
  const myPendingReg = state.regularizations.filter((r) => r.stage === 'rm' && r.status === 'pending' && rmOf(state.employees, r.emp) === me.name);
  const myPendingExp = state.expenses.filter((x) => x.stage === 'rm' && x.status === 'pending' && rmOf(state.employees, x.emp) === me.name);
  return (
    <>
      <PageHead title={`Team Dashboard — ${me.team}`} sub="Your team, and the chain above you. Sibling departments aren't visible from here." />
      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <StatTile label="Team Size" num={team.length} note={`${me.team} team`} view="directory" onClick={setView} />
        <StatTile label="Leave — awaiting you" num={myPendingLeave.length} note="first-level approval" view="leave" onClick={setView} />
        <StatTile label="Regularizations — awaiting you" num={myPendingReg.length} note="first-level approval" view="attendance" onClick={setView} />
        <StatTile label="Expenses — awaiting you" num={myPendingExp.length} note="first-level approval" view="expenses" onClick={setView} />
      </div>
      <section className="block">
        <div className="block-head"><h2>Your team</h2><button className="btn ghost sm" onClick={() => setView('directory')}>Open directory →</button></div>
        <div className="card"><table><thead><tr><th>Name</th><th>Designation</th><th>Status</th></tr></thead>
          <tbody>{team.map((e) => (
            <tr key={e.id}><td><div className="row-name"><div className="avatar">{initials(e.name)}</div>{e.name}</div></td><td>{e.designation}</td><td><StatusBadge status={e.status} /></td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <div className="footnote">CTC and salary details are restricted to HR Head/Founder and are not visible from your view, including in the Employee Directory and Payroll.</div>
    </>
  );
}

function EmployeeDashboard() {
  const { state, setView } = useHrTool();
  const me = state.currentUser!;
  const myLeave = state.leaveRequests.filter((l) => l.emp === me.name);
  const myTix = state.tickets.filter((t) => t.emp === me.name);
  const myAtt = state.attendance.find((a) => a.emp === me.name && a.date === todayStr());
  const ob = me.status === 'onboarding' ? state.onboarding.find((o) => o.employeeId === me.id) : null;
  return (
    <>
      <PageHead title={`Welcome back, ${me.name.split(' ')[0]}`} sub="Here's where things stand for you today." />
      {ob && <MyOnboardingCard obId={ob.id} />}
      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <div className="card pad">
          <div className="stat-label">Today</div>
          <div className="stat-num" style={{ fontSize: 19 }}>{myAtt ? myAtt.status : 'Not punched in'}</div>
          <div className="stat-note">{myAtt ? `${myAtt.inTime} – ${myAtt.outTime}` : 'Punch in from Attendance'}</div>
        </div>
        {Object.entries(me.leaveBalance).filter(([k]) => state.rules.leaveTypes[k] !== false).map(([k, v]) => (
          <div className="card pad" key={k}><div className="stat-label">{k} Leave</div><div className="stat-num">{v}</div><div className="stat-note">days remaining</div></div>
        ))}
      </div>
      <div className="grid grid-2">
        <section className="block">
          <div className="block-head"><h2>My leave requests</h2><button className="btn ghost sm" onClick={() => setView('leave')}>Open →</button></div>
          <div className="card pad">
            {myLeave.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div>{l.type} · {l.from}{l.to !== l.from ? ` – ${l.to}` : ''}</div><ApprovalBadge req={l} />
              </div>
            ))}
            {myLeave.length === 0 && <div className="empty">No leave requests yet.</div>}
          </div>
        </section>
        <section className="block">
          <div className="block-head"><h2>My helpdesk tickets</h2><button className="btn ghost sm" onClick={() => setView('helpdesk')}>Open →</button></div>
          <div className="card pad">
            {myTix.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div>{t.category}</div><StatusBadge status={t.status} />
              </div>
            ))}
            {myTix.length === 0 && <div className="empty">No open tickets.</div>}
          </div>
        </section>
      </div>
    </>
  );
}

function MyOnboardingCard({ obId }: { obId: string }) {
  const { state, persistOnboarding } = useHrTool();
  const o = state.onboarding.find((x) => x.id === obId);
  if (!o) return null;
  const approvedCount = o.docs.filter((d) => d.status === 'approved').length;
  const allApproved = o.docs.length > 0 && approvedCount === o.docs.length;
  const dl = o.uploadDeadline ? Math.ceil((new Date(o.uploadDeadline + 'T23:59:59').getTime() - new Date(todayStr()).getTime()) / 86400000) : null;
  const overdue = dl !== null && dl < 0 && !allApproved;

  async function myDocUpload(idx: number) {
    const updated = state.onboarding.map((x) => (x.id === obId ? { ...x, docs: x.docs.map((d, i) => (i === idx ? { ...d, status: 'pending' } : d)) } : x));
    await persistOnboarding(updated);
  }
  async function employeeSignAgreement() {
    const updated = state.onboarding.map((x) => (x.id === obId ? { ...x, agreementStage: 'pending_employer_signature' } : x));
    await persistOnboarding(updated);
  }

  return (
    <section className="block">
      <div className="card pad" style={{ borderColor: overdue ? '#FECACA' : 'var(--line)', marginBottom: 16 }}>
        <div className="block-head">
          <h2>Document upload — required to complete onboarding</h2>
          {allApproved ? <span className="badge approved">All documents approved</span> : overdue ? <span className="badge rejected">Upload window closed</span> : <span className="badge pending">{dl} day{dl === 1 ? '' : 's'} left</span>}
        </div>
        <div className="meta" style={{ marginBottom: 12 }}>Upload window: {o.signedDate} – {o.uploadDeadline}. HR Head reviews and approves each document below.</div>
        <table><thead><tr><th>Document</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>{o.docs.map((d, i) => (
            <tr key={i}><td>{d.name}</td><td><StatusBadge status={d.status} /></td>
              <td style={{ textAlign: 'right' }}>
                {(d.status === 'not_uploaded' || d.status === 'rejected') ? (
                  <label className="btn sm" style={{ display: 'inline-block' }}>{d.status === 'rejected' ? 'Re-upload' : 'Choose file'}
                    <input type="file" style={{ display: 'none' }} onChange={() => myDocUpload(i)} />
                  </label>
                ) : d.status === 'pending' ? <span className="meta">awaiting HR review</span> : <span className="meta">on file</span>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {o.agreementStage === 'pending_employee_signature' && (
        <div className="card pad" style={{ borderColor: '#BFDBFE' }}>
          <div className="block-head"><h2>Employment Agreement — your signature required</h2><span className="badge hrpending">Awaiting your signature</span></div>
          <div className="notice info" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
            <strong>Preview</strong><br />{agreementMerged(o, state.employees, state.templates, state.rules)}
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={employeeSignAgreement}>✓ Confirm, looks correct — sign agreement</button>
        </div>
      )}
      {(o.agreementStage === 'signed' || o.agreementStage === 'pending_employer_signature') && (
        <div className="notice good">
          You&apos;ve signed your Employment Agreement. {o.agreementStage === 'signed' ? 'Countersigned by HR — on file. You can download it anytime from My Documents.' : "Waiting on HR's countersignature."}
        </div>
      )}
    </section>
  );
}
