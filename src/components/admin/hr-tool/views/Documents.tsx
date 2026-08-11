'use client';

import { useHrTool } from '../HrToolContext';
import { StatusBadge, downloadDoc } from '../utils';

export default function Documents() {
  const { state, persistEmployees } = useHrTool();
  const me = state.currentUser!;
  const existing = me.documents || [];
  const docs = state.orgStructure.requiredDocuments.map((name) => existing.find((d) => d.name === name) || { name, status: 'not_uploaded' });
  const signed = me.signedDocs || [];

  async function uploadOrReplace(name: string) {
    const has = existing.find((d) => d.name === name);
    const nextDocs = has ? existing.map((d) => (d.name === name ? { ...d, status: 'pending' } : d)) : [...existing, { name, status: 'pending' }];
    await persistEmployees(state.employees.map((e) => (e.id === me.id ? { ...e, documents: nextDocs } : e)));
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">My Documents</h1><div className="page-sub">Everything of yours — identity documents, signed letters, and payslips. Upload or update anytime, not just during onboarding.</div></div>
        <div className="as-role">{me.name} · {state.role}</div>
      </div>
      <section className="block">
        <div className="block-head"><h2>Identity &amp; onboarding documents</h2></div>
        <div className="meta" style={{ marginBottom: 10 }}>This checklist is set by HR under Organisation Structure — you can upload or replace any of these anytime.</div>
        <div className="card"><table><thead><tr><th>Document</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.name}><td>{d.name}</td><td><StatusBadge status={d.status} /></td>
              <td style={{ textAlign: 'right' }}>
                <label className="btn sm" style={{ display: 'inline-block' }}>
                  {d.status === 'not_uploaded' ? 'Upload' : d.status === 'rejected' ? 'Re-upload' : 'Replace'}
                  <input type="file" style={{ display: 'none' }} onChange={() => uploadOrReplace(d.name)} />
                </label>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <section className="block">
        <div className="block-head"><h2>Signed letters</h2></div>
        <div className="card">
          {signed.length === 0 ? <div className="empty">No signed documents yet.</div> : (
            <table><thead><tr><th>Document</th><th>Signed on</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
              <tbody>{signed.map((d, i) => (
                <tr key={i}><td>{d.type}</td><td>{d.signedDate}</td><td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => downloadDoc(d.type.replace(/\s+/g, '_') + '.txt', d.content)}>⇩ Download</button></td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>
      <div className="footnote">Payslips live under Payroll. Nothing here is ever emailed — download a copy directly whenever you need one.</div>
    </>
  );
}
