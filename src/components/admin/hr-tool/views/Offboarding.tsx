'use client';

import { useHrTool } from '../HrToolContext';
import { initials } from '../utils';

export default function Offboarding() {
  const { state } = useHrTool();
  const exited = state.employees.filter((e) => e.status === 'exited');

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Offboarding</h1><div className="page-sub">Notice period, full &amp; final settlement, and asset return.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="card"><table><thead><tr><th>Employee</th><th>Designation</th><th>Last day (DOJ on file)</th></tr></thead>
        <tbody>
          {exited.map((e) => (
            <tr key={e.id}><td><div className="row-name"><div className="avatar">{initials(e.name)}</div>{e.name}</div></td><td>{e.designation}</td><td>{e.doj}</td></tr>
          ))}
          {exited.length === 0 && <tr><td colSpan={3}><div className="empty">No offboarded employees on record.</div></td></tr>}
        </tbody>
      </table></div>
      <div className="footnote">Mark an employee &quot;exited&quot; from their profile in the Employee Directory and they&apos;ll show up here. Detailed notice-period tracking, full &amp; final settlement, and asset-return checklists aren&apos;t wired up yet — relieving/experience letters would follow the same preview-then-sign pattern as the employment agreement once that&apos;s built out.</div>
    </>
  );
}
