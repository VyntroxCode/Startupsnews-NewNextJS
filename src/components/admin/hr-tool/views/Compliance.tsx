'use client';

import { useHrTool } from '../HrToolContext';
import { StatusBadge } from '../utils';

export default function Compliance() {
  const { state } = useHrTool();
  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Compliance Calendar &amp; Reminders</h1><div className="page-sub">Statutory due dates, auto-generated so nothing slips.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="card"><table><thead><tr><th>Task</th><th>Due date</th><th>Status</th></tr></thead>
        <tbody>
          {state.compliance.map((c, i) => <tr key={i}><td>{c.task}</td><td>{c.due}</td><td><StatusBadge status={c.status === 'upcoming' ? 'pending' : 'active'} /></td></tr>)}
          {state.compliance.length === 0 && <tr><td colSpan={3}><div className="empty">No compliance tasks configured yet.</div></td></tr>}
        </tbody>
      </table></div>
      <div className="grid grid-3" style={{ marginTop: 20 }}>
        <div className="card pad"><div className="stat-label">Shops &amp; Establishment</div><div className="stat-note" style={{ marginTop: 8 }}>Registration status tracked here once entered under Company Profile.</div></div>
        <div className="card pad"><div className="stat-label">PF / ESI</div><div className="stat-note" style={{ marginTop: 8 }}>{state.rules.pfEsi ? 'Active.' : 'Currently toggled off — one click to activate from Rules & Org Structure once headcount crosses the statutory threshold.'}</div></div>
        <div className="card pad"><div className="stat-label">Gratuity accrual</div><div className="stat-note" style={{ marginTop: 8 }}>Tracked per employee from DOJ · visible only to HR.</div></div>
      </div>
    </>
  );
}
