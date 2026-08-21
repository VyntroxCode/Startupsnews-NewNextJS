'use client';

import { useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { StatusBadge, daysLeft, initials } from '../utils';
import type { HrEmployee } from '../types';

function PageHead() {
  const { state } = useHrTool();
  return (
    <div className="topbar">
      <div>
        <h1 className="page-title">Employee Documents</h1>
        <div className="page-sub">Every document any employee has uploaded (or still owes), company-wide — with days left on their upload window.</div>
      </div>
      <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
    </div>
  );
}

interface DocRow {
  employee: HrEmployee;
  docIndex: number;
  docName: string;
  status: string;
  uploadedAt: string | null;
  url: string | null;
  remarks: string | null;
}

/** How many days remain on an employee's documents window — null if no deadline is set at all. */
function daysLeftFor(e: HrEmployee): number | null {
  return e.documentsDeadline ? daysLeft(e.documentsDeadline) : null;
}

function DaysLeftBadge({ employee }: { employee: HrEmployee }) {
  if (!employee.documentsDeadline) return <span className="meta">No deadline set</span>;
  const dl = daysLeftFor(employee);
  if (dl === null) return <span className="meta">—</span>;
  if (dl < 0) return <span className="badge rejected">Window closed</span>;
  if (dl <= 2) return <span className="badge rejected">{dl} day{dl === 1 ? '' : 's'} left</span>;
  if (dl <= 5) return <span className="badge pending">{dl} day{dl === 1 ? '' : 's'} left</span>;
  return <span className="badge active">{dl} days left</span>;
}

export default function EmployeeDocuments() {
  const { state, persistEmployees } = useHrTool();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{ empId: string; idx: number } | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const rows: DocRow[] = useMemo(() => {
    const list: DocRow[] = [];
    state.employees.forEach((e) => {
      e.documents.forEach((d, i) => {
        list.push({ employee: e, docIndex: i, docName: d.name, status: d.status, uploadedAt: d.uploadedAt || null, url: d.url || null, remarks: d.remarks || null });
      });
    });
    return list;
  }, [state.employees]);

  const counts = useMemo(() => ({
    total: rows.length,
    notUploaded: rows.filter((r) => r.status === 'not_uploaded').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows
      .filter((r) =>
        (r.employee.name.toLowerCase().includes(term) || r.docName.toLowerCase().includes(term)) &&
        (!statusFilter || r.status === statusFilter)
      )
      // Most urgent first: whoever's window is closing soonest (or already closed) floats to
      // the top; rows with no deadline sink to the bottom.
      .sort((a, b) => {
        const da = daysLeftFor(a.employee);
        const db = daysLeftFor(b.employee);
        if (da === null && db === null) return a.employee.name.localeCompare(b.employee.name);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
  }, [rows, search, statusFilter]);

  async function docAction(empId: string, idx: number, status: 'approved' | 'rejected') {
    if (status === 'rejected') { setRejectTarget({ empId, idx }); setRejectRemarks(''); return; }
    await persistEmployees(state.employees.map((e) => (e.id === empId ? { ...e, documents: e.documents.map((d, i) => (i === idx ? { ...d, status: 'approved', remarks: null } : d)) } : e)));
  }
  async function confirmReject() {
    if (!rejectTarget || !rejectRemarks.trim()) { alert('Remarks are required on rejection.'); return; }
    await persistEmployees(state.employees.map((e) => (e.id === rejectTarget.empId ? { ...e, documents: e.documents.map((d, i) => (i === rejectTarget.idx ? { ...d, status: 'rejected', remarks: rejectRemarks.trim() } : d)) } : e)));
    setRejectTarget(null);
  }

  return (
    <>
      <PageHead />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card pad">
          <div className="stat-label">Not Uploaded</div>
          <div className="stat-num">{counts.notUploaded}</div>
          <div className="stat-note">of {counts.total} total documents</div>
        </div>
        <div className="card pad">
          <div className="stat-label">Pending Review</div>
          <div className="stat-num">{counts.pending}</div>
          <div className="stat-note">awaiting your approval</div>
        </div>
        <div className="card pad">
          <div className="stat-label">Approved</div>
          <div className="stat-num">{counts.approved}</div>
          <div className="stat-note">on file</div>
        </div>
        <div className="card pad">
          <div className="stat-label">Rejected</div>
          <div className="stat-num">{counts.rejected}</div>
          <div className="stat-note">need a re-upload</div>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <div className="toolbar">
          <input className="search" type="text" placeholder="Search by employee or document" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 180 }}>
            <option value="">All statuses</option>
            <option value="not_uploaded">Not uploaded</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th><th>Document</th><th>Status</th><th>Uploaded</th><th>Deadline</th><th>Days Left</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.employee.id + '-' + r.docIndex}>
                <td>
                  <div className="row-name">
                    <div className="avatar">{initials(r.employee.name)}</div>
                    <div><div>{r.employee.name}</div><div className="meta">{r.employee.designation}</div></div>
                  </div>
                </td>
                <td>
                  {r.docName}
                  {r.status === 'rejected' && r.remarks && <div className="meta" style={{ color: 'var(--red)', marginTop: 2 }}>Rejected: {r.remarks}</div>}
                </td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.uploadedAt || <span className="meta">—</span>}</td>
                <td>{r.employee.documentsDeadline || <span className="meta">—</span>}</td>
                <td><DaysLeftBadge employee={r.employee} /></td>
                <td style={{ textAlign: 'right' }}>
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn ghost sm" style={{ marginRight: 6 }}>View / Download</a>}
                  {r.status === 'pending' && (
                    <>
                      <button className="btn approve sm" onClick={() => docAction(r.employee.id, r.docIndex, 'approved')}>Approve</button>{' '}
                      <button className="btn reject sm" onClick={() => docAction(r.employee.id, r.docIndex, 'rejected')}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7}><div className="empty">No documents match this search.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {rejectTarget && (
        <ModalShell title="Reject document" onClose={() => setRejectTarget(null)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setRejectTarget(null) },
          { label: 'Reject', cls: 'btn reject', onClick: confirmReject },
        ]}>
          <div className="field"><label className="field-label">Remarks (required — shown to the employee)</label><textarea value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} /></div>
        </ModalShell>
      )}
    </>
  );
}
