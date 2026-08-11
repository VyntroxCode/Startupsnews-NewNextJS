'use client';

import { useHrTool } from '../HrToolContext';

export default function Posh() {
  const { state } = useHrTool();
  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">POSH Internal Committee</h1><div className="page-sub">Confidential — visible only to IC members.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="notice">This module is access-restricted. Complaint logs and resolution timelines are only visible to designated Internal Committee members.</div>
      <div className="card pad">
        <div className="field"><label className="field-label">IC Members</label>Divya Menon (Presiding Officer) · Ananya Rao · External Member — Adv. S. Krishnan</div>
        <div className="field"><label className="field-label">Complaint log</label><span className="meta">No open complaints on record.</span></div>
      </div>
    </>
  );
}
