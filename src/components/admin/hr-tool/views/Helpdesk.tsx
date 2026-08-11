'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { StatusBadge, isAdmin, rmOf } from '../utils';

export default function Helpdesk() {
  const { state, persistTickets } = useHrTool();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('Payroll Query');
  const [note, setNote] = useState('');

  const admin = isAdmin(state.role);
  const rows = admin
    ? state.tickets
    : state.role === 'Reporting Manager'
      ? state.tickets.filter((t) => t.emp === state.currentUser?.name || rmOf(state.employees, t.emp) === state.currentUser?.name)
      : state.tickets.filter((t) => t.emp === state.currentUser?.name);

  async function submit() {
    await persistTickets([{ id: 'T-' + Date.now(), emp: state.currentUser ? state.currentUser.name : 'You', category, status: 'open', note: note || '—' }, ...state.tickets]);
    setOpen(false);
  }
  async function updateStatus(id: string, status: string) {
    await persistTickets(state.tickets.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">HR Helpdesk / Grievance</h1><div className="page-sub">Tickets routed by category — POSH tickets go straight to the IC, confidentially.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn primary" onClick={() => { setCategory('Payroll Query'); setNote(''); setOpen(true); }}>+ Raise a ticket</button>
      </div>
      <div className="card"><table><thead><tr><th>Employee</th><th>Category</th><th>Note</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}><td>{t.emp}</td><td>{t.category}</td><td>{t.note}</td><td><StatusBadge status={t.status} /></td>
              <td style={{ textAlign: 'right' }}>
                {admin ? (
                  <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)} style={{ width: 'auto' }}>
                    <option value="open">Open</option><option value="progress">In Progress</option><option value="resolved">Resolved</option>
                  </select>
                ) : <StatusBadge status={t.status} />}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5}><div className="empty">No tickets.</div></td></tr>}
        </tbody>
      </table></div>

      {open && (
        <ModalShell title="Raise a ticket" onClose={() => setOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setOpen(false) },
          { label: 'Submit', cls: 'btn primary', onClick: submit },
        ]}>
          <div className="field"><label className="field-label">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Payroll Query</option><option>Leave Query</option><option>General</option>
              <option>POSH-related (confidential, routed to IC only)</option>
            </select>
          </div>
          <div className="field"><label className="field-label">Note</label><textarea placeholder="Describe your query..." value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </ModalShell>
      )}
    </>
  );
}
