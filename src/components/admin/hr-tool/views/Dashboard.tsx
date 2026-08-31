'use client';

import { useHrTool } from '../HrToolContext';
import { StatusBadge, ApprovalBadge, initials, rmOf, todayStr, monthKeyToLabel } from '../utils';
import type { HrView } from '../types';

/** `tone` is an optional green/red accent for tiles that represent a done/not-done state (e.g.
 * Payroll Cycle) — omit it for plain count tiles, which stay neutral. */
function StatTile({ label, num, note, view, onClick, tone, longNum }: { label: string; num: string | number; note: string; view: HrView; onClick: (v: HrView) => void; tone?: 'good' | 'bad'; longNum?: boolean }) {
  return (
    <div className={`card pad clickable${tone ? ` tone-${tone}` : ''}`} onClick={() => onClick(view)}>
      <div className="stat-label">{label}</div>
      <div className={`stat-num${longNum ? ' stat-num-text' : ''}`}>{num}</div>
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
  const pendingReg = state.regularizations.filter((r) => r.status === 'pending').length;
  const pendingExp = state.expenses.filter((x) => x.status === 'pending').length;

  return (
    <>
      <PageHead title="Dashboard" sub="A quick read on what needs your attention today. Every number below is clickable." />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatTile label="Active Team" num={active} note={`${probation.length} on probation`} view="directory" onClick={setView} />
        <StatTile label="Pending Regularizations" num={pendingReg} note="across manager + HR review" view="attendance" onClick={setView} />
        <StatTile
          label="Payroll Cycle"
          num={monthKeyToLabel(state.payrollRun.month)}
          note={state.payrollRun.status === 'not_run' ? 'not yet run' : 'completed'}
          view="payroll"
          onClick={setView}
          tone={state.payrollRun.status === 'not_run' ? 'bad' : 'good'}
          longNum
        />
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
      <div className="footnote">CTC and salary details are restricted to HR Head/Founder and are not visible from your view, including in the Directory and Payroll.</div>
    </>
  );
}

function EmployeeDashboard() {
  const { state, setView } = useHrTool();
  const me = state.currentUser!;
  const myLeave = state.leaveRequests.filter((l) => l.emp === me.name);
  const myTix = state.tickets.filter((t) => t.emp === me.name);
  const myAtt = state.attendance.find((a) => a.emp === me.name && a.date === todayStr());
  return (
    <>
      <PageHead title={`Welcome back, ${me.name.split(' ')[0]}`} sub="Here's where things stand for you today." />
      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <div className="card pad">
          <div className="stat-label">Today</div>
          <div className="stat-num" style={{ fontSize: 19 }}>{myAtt ? myAtt.status : 'Not punched in'}</div>
          <div className="stat-note">{myAtt ? `${myAtt.inTime} – ${myAtt.outTime}` : 'Punch in from Attendance'}</div>
        </div>
        {Object.entries(me.leaveBalance).filter(([k]) => state.rules.leaveTypes[k]?.enabled !== false).map(([k, v]) => (
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
