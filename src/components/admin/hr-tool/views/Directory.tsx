'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import HireEmployeeButton from './HireEmployeeButton';
import EditCredentialModal from './EditCredentialModal';
import AttendanceCalendar from './AttendanceCalendar';
import { PANEL_ROLE_LABEL } from './CredentialFields';
import { StatusBadge, addDays, initialLeaveBalance, computeCtcBreakdown, daysLeft, exportCSV, exportExcel, initials, isAdmin, nextEmployeeId, todayStr } from '../utils';

/** How many days a new hire has to submit their required-documents checklist, counted from doj. */
const DOCUMENTS_WINDOW_DAYS = 5;
import type { HrEmployee } from '../types';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';
import { KYC_SECTIONS, emptyKycDocuments } from '../types';

function fmtDoj(doj: string): string {
  if (!doj) return '—';
  const d = new Date(doj + 'T00:00:00');
  if (isNaN(d.getTime())) return doj;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** How far through their document checklist an employee is. `uploaded` counts anything that is
 * no longer 'not_uploaded' — including items still awaiting HR review — because from the
 * employee's side the file has been handed over. `rejected` is tracked separately: a rejected
 * item was uploaded, but still needs re-uploading, so it must not read as complete. */
function docProgress(e: HrEmployee): { total: number; uploaded: number; rejected: number } {
  const total = e.documents.length;
  return {
    total,
    uploaded: e.documents.filter((d) => d.status !== 'not_uploaded').length,
    rejected: e.documents.filter((d) => d.status === 'rejected').length,
  };
}

/** The Employee ID is black ONLY when the whole checklist is in and nothing was rejected.
 * Anything short of that — a single missing item, a single rejection, or no checklist assigned
 * at all — shows red. Previously this flagged only employees with NOTHING uploaded, so someone
 * sitting at 4 of 5, or whose upload had been rejected, looked identical to someone fully done. */
function documentsIncomplete(e: HrEmployee): boolean {
  const { total, uploaded, rejected } = docProgress(e);
  if (total === 0) return true;
  return uploaded < total || rejected > 0;
}

/** Why a given employee is flagged — the remedy differs per case, so the tooltip has to say. */
function documentsIssue(e: HrEmployee): string | undefined {
  const { total, uploaded, rejected } = docProgress(e);
  if (total === 0) return 'No document checklist assigned — nothing has been requested from this employee yet';
  if (rejected > 0) return `${rejected} document${rejected === 1 ? '' : 's'} rejected — needs re-uploading (${uploaded}/${total} submitted)`;
  if (uploaded < total) return `Only ${uploaded} of ${total} documents uploaded`;
  return undefined;
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

export default function Directory() {
  const { state, persistEmployees, deleteEmployee, persistDesignations, logRuleChange, upsertEmployeeCredentialInState } = useHrTool();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ctcSplitId, setCtcSplitId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [editingCredential, setEditingCredential] = useState<HrEmployeeCredential | null>(null);
  const [issuingCredentialFor, setIssuingCredentialFor] = useState<HrEmployee | null>(null);
  const [addingOrphanId, setAddingOrphanId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [docRejectTarget, setDocRejectTarget] = useState<{ empId: string; idx: number } | null>(null);
  const [docRejectRemarks, setDocRejectRemarks] = useState('');
  const [kycRejectTarget, setKycRejectTarget] = useState<{ empId: string; slotKey: string } | null>(null);
  const [kycRejectRemarks, setKycRejectRemarks] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('');

  const admin = isAdmin(state.role);
  const founder = state.role === 'Founder';

  const visibleEmployees = useMemo(() => {
    if (admin) return state.employees;
    if (state.role === 'Reporting Manager') return state.employees.filter((e) => e.team === state.currentUser?.team);
    return state.employees.filter((e) => e.id === state.currentUser?.id);
  }, [state.employees, state.role, state.currentUser, admin]);

  // Same credentialId-first/name-fallback resolution EmployeeProfileModal already uses to find
  // an employee's Employee ID — reused here so the table can sort and display by it.
  const credentialByEmployee = useMemo(() => {
    const byId = new Map(state.employeeCredentials.map((c) => [c.id, c]));
    const byName = new Map(state.employeeCredentials.map((c) => [c.name, c]));
    return (e: HrEmployee) => (e.credentialId != null ? byId.get(e.credentialId) : undefined) || byName.get(e.name);
  }, [state.employeeCredentials]);

  function employeeCodeNum(code?: string | null): number {
    const digits = code?.match(/(\d+)$/)?.[1];
    return digits ? parseInt(digits, 10) : Number.POSITIVE_INFINITY;
  }

  // Sorted ascending by assigned Employee ID (e.g. SNFYI-2002 before SNFYI-2003) — employees
  // with no Employee ID yet (never issued one, or an old CSV import) sort to the end.
  const rows = useMemo(() => {
    const filtered = visibleEmployees.filter((e) =>
      (e.name.toLowerCase().includes(search.toLowerCase()) || e.designation.toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || e.status === statusFilter) && (!teamFilter || e.team === teamFilter)
    );
    return [...filtered].sort((a, b) =>
      employeeCodeNum(credentialByEmployee(a)?.employeeCode) - employeeCodeNum(credentialByEmployee(b)?.employeeCode)
    );
  }, [visibleEmployees, search, statusFilter, teamFilter, credentialByEmployee]);

  // Employee IDs issued (e.g. via the old Assigning IDs flow, or a partial failure right after
  // hiring) that never got a matching Directory record — auto-healed below so every created
  // employee reliably shows up in the Directory, not just Founder's concern. Matches by
  // credentialId first, name second.
  const orphanCredentials = useMemo(() => admin
    ? state.employeeCredentials.filter((c) => c.isActive &&
        !state.employees.some((e) => e.credentialId === c.id || e.name === c.name))
    : [], [state.employeeCredentials, state.employees, admin]);

  // Defence in depth behind the ordering fix in HireEmployeeButton: a credential is attempted
  // at most ONCE per session. Without this, any path that leaves a credential looking orphaned —
  // a failed save, a race, a name mismatch — would have the effect below re-firing on every
  // state change and minting a fresh Directory record each time.
  const healedCredentialIds = useRef<Set<number>>(new Set());

  async function addOrphanToDirectory(c: HrEmployeeCredential) {
    if (healedCredentialIds.current.has(c.id)) return;
    healedCredentialIds.current.add(c.id);
    setAddingOrphanId(c.id);
    const doj = new Date(c.createdAt).toISOString().slice(0, 10);
    const documents = state.orgStructure.requiredDocuments.map((name) => ({ name, status: 'not_uploaded', url: null, uploadedAt: null, remarks: null }));
    const newEmployee: HrEmployee = {
      id: nextEmployeeId(state.employees), credentialId: c.id, name: c.name, email: c.email || '—', phone: null,
      designation: c.designation, team: state.teams[0]?.name || '', manager: null, status: 'active',
      doj, sysRole: 'Employee', ctc: 0,
      leaveBalance: initialLeaveBalance(state.rules),
      documents,
      documentsDeadline: documents.length ? addDays(doj, DOCUMENTS_WINDOW_DAYS) : null,
      kycDocuments: emptyKycDocuments(),
      signedDocs: [],
    };
    await persistEmployees([...state.employees, newEmployee]);
    logRuleChange(`Added ${c.name} to Directory from an existing Employee ID (${c.employeeCode})`);
    setAddingOrphanId(null);
  }

  // Auto-heal instead of waiting on a manual click: every Employee ID should always show up in
  // the Directory, full stop. Runs one at a time (guarded by addingOrphanId) — persistEmployees
  // resolving shrinks orphanCredentials by one, which re-fires this effect for the next one,
  // until none remain.
  useEffect(() => {
    if (orphanCredentials.length === 0 || addingOrphanId !== null) return;
    const next = orphanCredentials.find((c) => !healedCredentialIds.current.has(c.id));
    if (!next) return;
    addOrphanToDirectory(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orphanCredentials, addingOrphanId]);

  async function saveEmployeeEdits(e: HrEmployee, updates: Partial<HrEmployee>) {
    await persistEmployees(state.employees.map((x) => (x.id === e.id ? { ...x, ...updates } : x)));
    logRuleChange(`Updated ${e.name}'s details`);
  }

  function exportDirectory(fmt: 'csv' | 'excel') {
    const exportRows: (string | number)[][] = [['Employee ID', 'Name', 'Email', 'Designation', 'Team', 'Status', 'DOJ', 'Annual CTC']];
    [...visibleEmployees]
      .sort((a, b) => employeeCodeNum(credentialByEmployee(a)?.employeeCode) - employeeCodeNum(credentialByEmployee(b)?.employeeCode))
      .forEach((e) => exportRows.push([credentialByEmployee(e)?.employeeCode || '—', e.name, e.email, e.designation, e.team, e.status, e.doj, e.ctc]));
    if (fmt === 'csv') exportCSV('employee_directory.csv', exportRows); else exportExcel('employee_directory.xlsx', exportRows);
  }

  /** Permanent delete — the employee, their Employee ID login and all of their records. The
   * Employee ID has to go with them: while it exists, the orphan auto-heal above treats the
   * missing Directory row as a gap to fill and puts the employee straight back. */
  async function removeEmployeeRecord(e: HrEmployee) {
    if (removingId) return;
    if (!confirm(
      `Permanently delete ${e.name}?\n\n` +
      'This removes their Directory record, their Employee ID login, and all of their attendance, ' +
      'leave, expense, ticket and payroll records.\n\n' +
      'For a real exit use "Mark as exited" instead — that keeps the record and moves them to ' +
      "Offboarding. This can't be undone."
    )) return;
    setRemovingId(e.id);
    try {
      await deleteEmployee(e);
      logRuleChange(`Deleted employee ${e.name} — record, Employee ID and all related data`);
      setProfileId(null);
    } catch (err) {
      alert(`Could not delete ${e.name}. ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setRemovingId(null);
    }
  }
  async function confirmProbation(e: HrEmployee) {
    await persistEmployees(state.employees.map((x) => (x.id === e.id ? { ...x, status: 'active', leaveBalance: initialLeaveBalance(state.rules) } : x)));
    logRuleChange(`Confirmed ${e.name} — moved from Probation to Active`);
    setProfileId(null);
  }
  async function extendProbation(e: HrEmployee) {
    const days = prompt('Extend probation by how many days?', '30');
    if (!days || isNaN(Number(days))) return;
    await persistEmployees(state.employees.map((x) => (x.id === e.id ? { ...x, probationExtendedBy: (x.probationExtendedBy || 0) + Number(days) } : x)));
    logRuleChange(`Extended ${e.name}'s probation by ${days} days`);
    setProfileId(null);
  }
  async function markExited(e: HrEmployee) {
    if (!confirm(`Mark ${e.name} as exited? They'll move to Offboarding and lose portal access. This doesn't delete their record.`)) return;
    await persistEmployees(state.employees.map((x) => (x.id === e.id ? { ...x, status: 'exited' } : x)));
    logRuleChange(`Marked ${e.name} as exited`);
    setProfileId(null);
  }

  async function docAction(empId: string, idx: number, status: 'approved' | 'rejected') {
    if (status === 'rejected') { setDocRejectTarget({ empId, idx }); setDocRejectRemarks(''); return; }
    await persistEmployees(state.employees.map((e) => (e.id === empId ? { ...e, documents: e.documents.map((d, i) => (i === idx ? { ...d, status: 'approved', remarks: null } : d)) } : e)));
  }
  async function kycDocAction(empId: string, slotKey: string, status: 'approved' | 'rejected') {
    if (status === 'rejected') { setKycRejectTarget({ empId, slotKey }); setKycRejectRemarks(''); return; }
    await persistEmployees(state.employees.map((e) => (e.id === empId ? { ...e, kycDocuments: { ...e.kycDocuments, [slotKey]: { ...e.kycDocuments[slotKey], status: 'approved', remarks: null } } } : e)));
  }
  async function confirmKycDocReject() {
    if (!kycRejectTarget || !kycRejectRemarks.trim()) { alert('Remarks are required on rejection.'); return; }
    await persistEmployees(state.employees.map((e) => (e.id === kycRejectTarget.empId ? { ...e, kycDocuments: { ...e.kycDocuments, [kycRejectTarget.slotKey]: { ...e.kycDocuments[kycRejectTarget.slotKey], status: 'rejected', remarks: kycRejectRemarks.trim() } } } : e)));
    setKycRejectTarget(null);
  }
  async function confirmDocReject() {
    if (!docRejectTarget || !docRejectRemarks.trim()) { alert('Remarks are required on rejection.'); return; }
    await persistEmployees(state.employees.map((e) => (e.id === docRejectTarget.empId ? { ...e, documents: e.documents.map((d, i) => (i === docRejectTarget.idx ? { ...d, status: 'rejected', remarks: docRejectRemarks.trim() } : d)) } : e)));
    setDocRejectTarget(null);
  }

  async function importCsv() {
    const raw = csvData.trim();
    if (!raw) { alert('Paste CSV data first.'); return; }
    const lines = raw.split('\n').filter((l) => l.trim() && !l.toLowerCase().startsWith('name,'));
    let designations = state.orgStructure.designations;
    let employees = state.employees;
    let count = 0;
    for (const line of lines) {
      const [name, email, designation, team, manager, doj, ctc] = line.split(',').map((s) => s.trim());
      if (!name) continue;
      if (designation && !designations.includes(designation)) designations = [...designations, designation];
      const newId = nextEmployeeId(employees);
      const resolvedDoj = doj || todayStr();
      const newDocuments = state.orgStructure.requiredDocuments.map((docName) => ({ name: docName, status: 'not_uploaded', url: null, uploadedAt: null, remarks: null }));
      employees = [...employees, {
        id: newId, name, email: email || '—', phone: null, designation: designation || '—', team: team || state.teams[0]?.name || '',
        manager: manager || null, status: 'active', doj: resolvedDoj, sysRole: 'Employee', ctc: Number(ctc) || 0,
        leaveBalance: initialLeaveBalance(state.rules),
        documents: newDocuments,
        documentsDeadline: newDocuments.length ? addDays(resolvedDoj, DOCUMENTS_WINDOW_DAYS) : null,
        kycDocuments: emptyKycDocuments(),
        signedDocs: [],
      }];
      count++;
    }
    if (designations !== state.orgStructure.designations) await persistDesignations(designations);
    await persistEmployees(employees);
    setBulkOpen(false);
    alert(`${count} employee(s) imported. No login was created — open each profile and click "Issue Employee ID" to give them one.`);
  }

  const profile = profileId ? state.employees.find((e) => e.id === profileId) || null : null;

  // Merged in from the old standalone "Employee Documents" page — every non-exited employee
  // with a documents checklist at all, not just new hires still mid-window.
  const docEmployees = useMemo(() => {
    if (!admin) return [];
    return state.employees.filter((e) => e.status !== 'exited' && e.documents.length > 0);
  }, [state.employees, admin]);

  const docStats = useMemo(() => {
    const allDocs = docEmployees.flatMap((e) => e.documents);
    return {
      total: allDocs.length,
      notUploaded: allDocs.filter((d) => d.status === 'not_uploaded').length,
      pending: allDocs.filter((d) => d.status === 'pending').length,
      approved: allDocs.filter((d) => d.status === 'approved').length,
      rejected: allDocs.filter((d) => d.status === 'rejected').length,
    };
  }, [docEmployees]);

  const filteredDocEmployees = useMemo(() => {
    const term = docSearch.trim().toLowerCase();
    return docEmployees
      .filter((e) => {
        const matchesTerm = !term || e.name.toLowerCase().includes(term) || e.documents.some((d) => d.name.toLowerCase().includes(term));
        const matchesStatus = !docStatusFilter || e.documents.some((d) => d.status === docStatusFilter);
        return matchesTerm && matchesStatus;
      })
      // Most urgent first: whoever's window is closing soonest (or already closed) floats to
      // the top; employees with no deadline sink to the bottom.
      .sort((a, b) => {
        const da = a.documentsDeadline ? daysLeft(a.documentsDeadline) : null;
        const db = b.documentsDeadline ? daysLeft(b.documentsDeadline) : null;
        if (da === null && db === null) return a.name.localeCompare(b.name);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
  }, [docEmployees, docSearch, docStatusFilter]);

  return (
    <>
      <PageHead title="Directory" sub={admin ? "Search, filter, and open any employee's full profile." : "Your team only — sibling departments aren't visible here."} />

      {addingOrphanId !== null && (
        <div className="notice info" style={{ marginBottom: 16 }}>
          Syncing an Employee ID that was missing from the Directory — it&apos;ll appear in the table below in a moment.
        </div>
      )}

      <div className="toolbar" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <div className="toolbar">
          <input className="search" type="text" placeholder="Search by name or designation" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 150 }}>
            <option value="">All statuses</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="probation">Probation</option><option value="exited">Exited</option>
          </select>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} style={{ width: 170 }}>
            <option value="">All teams</option>{state.teams.map((t) => <option key={t.name}>{t.name}</option>)}
          </select>
        </div>
        {admin && (
          <div className="toolbar">
            <button className="btn sm" onClick={() => exportDirectory('csv')}>⇩ CSV</button>
            <button className="btn sm" onClick={() => exportDirectory('excel')}>⇩ Excel</button>
            <button className="btn" onClick={() => setBulkOpen(true)}>⇧ Bulk import (CSV)</button>
            <HireEmployeeButton label="+ Add Employee" className="btn primary" />
          </div>
        )}
      </div>
      <div className="card"><div className="table-scroll"><table><thead><tr><th>Employee ID</th><th>Name</th><th>Designation</th><th>Team</th><th>Date of Joining</th><th>Documents</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} onClick={() => setProfileId(e.id)} style={{ cursor: 'pointer' }}>
              <td>
                {credentialByEmployee(e)?.employeeCode ? (
                  <code style={documentsIncomplete(e) ? { color: 'var(--red)' } : undefined} title={documentsIssue(e)}>
                    {credentialByEmployee(e)?.employeeCode}
                  </code>
                ) : <span className="meta">—</span>}
              </td>
              <td><div className="row-name"><div className="avatar">{initials(e.name)}</div><div><div>{e.name}</div><div className="meta">{e.email}</div></div></div></td>
              <td>{e.designation}</td><td>{e.team}</td><td>{fmtDoj(e.doj)}</td>
              <td>{(() => {
                const { total, uploaded, rejected } = docProgress(e);
                if (total === 0) return <span className="badge rejected" title="No checklist assigned">No checklist</span>;
                return (
                  <>
                    <span className={`badge ${documentsIncomplete(e) ? 'rejected' : 'approved'}`}>{uploaded}/{total}</span>
                    {rejected > 0 && <div className="meta" style={{ color: 'var(--red)', marginTop: 2 }}>{rejected} rejected</div>}
                  </>
                );
              })()}</td>
              <td><StatusBadge status={e.status} /></td>
              <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setProfileId(e.id); }}>{admin ? 'View / Edit →' : 'View profile →'}</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8}><div className="empty">No employees match this search.</div></td></tr>}
        </tbody>
      </table></div></div>

      {admin && <DocumentUploadRequests currentUser={state.currentUser?.name || 'HR'} />}

      {admin && docEmployees.length > 0 && (
        <section className="block" style={{ marginTop: 16 }}>
          <div className="block-head"><h2>Documents</h2></div>
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <div className="card pad"><div className="stat-label">Not Uploaded</div><div className="stat-num">{docStats.notUploaded}</div><div className="stat-note">of {docStats.total} total documents</div></div>
            <div className="card pad"><div className="stat-label">Pending Review</div><div className="stat-num">{docStats.pending}</div><div className="stat-note">awaiting your approval</div></div>
            <div className="card pad"><div className="stat-label">Approved</div><div className="stat-num">{docStats.approved}</div><div className="stat-note">on file</div></div>
            <div className="card pad"><div className="stat-label">Rejected</div><div className="stat-num">{docStats.rejected}</div><div className="stat-note">need a re-upload</div></div>
          </div>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <input className="search" type="text" placeholder="Search by employee or document" value={docSearch} onChange={(e) => setDocSearch(e.target.value)} />
            <select value={docStatusFilter} onChange={(e) => setDocStatusFilter(e.target.value)} style={{ width: 180 }}>
              <option value="">All statuses</option>
              <option value="not_uploaded">Not uploaded</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {filteredDocEmployees.map((e) => (
            <DocumentTrackerCard key={e.id} employee={e} onApprove={(idx) => docAction(e.id, idx, 'approved')} onReject={(idx) => docAction(e.id, idx, 'rejected')} />
          ))}
          {filteredDocEmployees.length === 0 && <div className="card pad"><div className="empty">No employees match this search.</div></div>}
        </section>
      )}

      {docRejectTarget && (
        <ModalShell title="Reject document" onClose={() => setDocRejectTarget(null)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setDocRejectTarget(null) },
          { label: 'Reject', cls: 'btn reject', onClick: confirmDocReject },
        ]}>
          <div className="field"><label className="field-label">Remarks (required — shown to the employee)</label><textarea value={docRejectRemarks} onChange={(e) => setDocRejectRemarks(e.target.value)} /></div>
        </ModalShell>
      )}

      {kycRejectTarget && (
        <ModalShell title="Reject KYC document" onClose={() => setKycRejectTarget(null)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setKycRejectTarget(null) },
          { label: 'Reject', cls: 'btn reject', onClick: confirmKycDocReject },
        ]}>
          <div className="field"><label className="field-label">Remarks (required — shown to the employee)</label><textarea value={kycRejectRemarks} onChange={(e) => setKycRejectRemarks(e.target.value)} /></div>
        </ModalShell>
      )}

      {profile && !ctcSplitId && (
        <EmployeeProfileModal
          employee={profile}
          admin={admin}
          founder={founder}
          onClose={() => setProfileId(null)}
          onEditCtcSplit={() => setCtcSplitId(profile.id)}
          onRemove={() => removeEmployeeRecord(profile)}
          onConfirmProbation={() => confirmProbation(profile)}
          onExtendProbation={() => extendProbation(profile)}
          onMarkExited={() => markExited(profile)}
          onEditCredential={(c) => setEditingCredential(c)}
          onIssueCredential={() => setIssuingCredentialFor(profile)}
          onApproveDoc={(idx) => docAction(profile.id, idx, 'approved')}
          onRejectDoc={(idx) => docAction(profile.id, idx, 'rejected')}
          onApproveKyc={(slotKey) => kycDocAction(profile.id, slotKey, 'approved')}
          onRejectKyc={(slotKey) => kycDocAction(profile.id, slotKey, 'rejected')}
          onSaveEdits={(updates) => saveEmployeeEdits(profile, updates)}
        />
      )}
      {ctcSplitId && (
        <CtcSplitModal employeeId={ctcSplitId} onClose={() => setCtcSplitId(null)} />
      )}
      {editingCredential && (
        <EditCredentialModal
          credential={editingCredential}
          existingCredentials={state.employeeCredentials}
          onClose={() => setEditingCredential(null)}
          onSaved={(updated) => upsertEmployeeCredentialInState(updated)}
        />
      )}
      {issuingCredentialFor && (
        <EditCredentialModal
          seed={{ name: issuingCredentialFor.name, designation: issuingCredentialFor.designation, email: issuingCredentialFor.email }}
          existingCredentials={state.employeeCredentials}
          onClose={() => setIssuingCredentialFor(null)}
          onSaved={async (created) => {
            upsertEmployeeCredentialInState(created);
            await persistEmployees(state.employees.map((e) => (e.id === issuingCredentialFor.id ? { ...e, credentialId: created.id } : e)));
          }}
        />
      )}

      {bulkOpen && (
        <ModalShell title="Bulk import employees (CSV)" onClose={() => setBulkOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setBulkOpen(false) },
          { label: 'Import employees', cls: 'btn primary', onClick: importCsv },
        ]}>
          <div className="notice info">Use this once to bring in employees you&apos;ve already onboarded outside this tool. Columns: Name, Email, Designation, Team, Manager, DOJ, CTC. Any designation not already in Organisation Structure gets added automatically.</div>
          <div className="field"><label className="field-label">Paste CSV data (or choose a file in production)</label>
            <textarea style={{ minHeight: 110 }} placeholder={'Name,Email,Designation,Team,Manager,DOJ,CTC\nKavita Rao,kavita.rao@snf.co,Social Media Executive,Partnerships & BD,Kunal Verma,2025-01-10,380000'}
              value={csvData} onChange={(e) => setCsvData(e.target.value)} />
          </div>
        </ModalShell>
      )}
    </>
  );
}

/** One employee's document-checklist card in Directory's merged "Documents" section — mirrors
 * the old (now-removed) Onboarding.tsx OnboardingCard's layout (name/window/badge/progress) but
 * driven by the real HrEmployee.documents + documentsDeadline instead of the dead HrOnboarding
 * pipeline. Split two ways per employee: documents actually provided (uploaded, whatever their
 * review state) on the left, documents still outstanding (never uploaded) on the right — reusing
 * the app's existing `grid grid-2` layout rather than one-off CSS. */
function DocumentTrackerCard({ employee, onApprove, onReject }: {
  employee: HrEmployee; onApprove: (idx: number) => void; onReject: (idx: number) => void;
}) {
  const { state } = useHrTool();
  const employeeCode = (employee.credentialId != null
    ? state.employeeCredentials.find((c) => c.id === employee.credentialId)
    : state.employeeCredentials.find((c) => c.name === employee.name))?.employeeCode || '';
  const docs = employee.documents;
  const approvedCount = docs.filter((d) => d.status === 'approved').length;
  const indexed = docs.map((d, i) => ({ ...d, idx: i }));
  const provided = indexed.filter((d) => d.status !== 'not_uploaded');
  const pending = indexed.filter((d) => d.status === 'not_uploaded');
  const pct = docs.length ? Math.round((approvedCount / docs.length) * 100) : 0;
  const dl = employee.documentsDeadline ? daysLeft(employee.documentsDeadline) : null;
  const overdue = dl !== null && dl < 0 && pct < 100;

  return (
    <div className="card pad" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div className="row-name">
          <div className="avatar">{initials(employee.name)}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{employee.name}</div>
            {/* Employee ID here is the SNFYI credential code, never the internal E-### row key. */}
            <div className="meta">{employee.designation}{employeeCode ? ` · ${employeeCode}` : ''}{employee.documentsDeadline ? ` · window ${employee.doj} → ${employee.documentsDeadline}` : ''}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`badge ${pct === 100 ? 'approved' : overdue ? 'rejected' : 'pending'}`}>
            {pct === 100 ? 'All docs approved' : overdue ? 'Window closed' : dl !== null ? `${dl} day${dl === 1 ? '' : 's'} left` : 'No deadline set'}
          </span>
          <div className="meta" style={{ marginTop: 4 }}>{approvedCount}/{docs.length} approved · {provided.length}/{docs.length} uploaded</div>
        </div>
      </div>
      <div className="progress-track" style={{ marginBottom: 14 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>

      <div className="grid grid-2">
        <div>
          <div className="stat-label" style={{ marginBottom: 8 }}>Provided ({provided.length})</div>
          {provided.length === 0 ? <div className="meta">Nothing uploaded yet.</div> : (
            <table><thead><tr><th>Document</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
              <tbody>{provided.map((d) => (
                <tr key={d.name}>
                  <td>
                    {d.name}
                    {d.status === 'rejected' && d.remarks && <div className="meta" style={{ color: 'var(--red)', marginTop: 2 }}>Rejected: {d.remarks}</div>}
                  </td>
                  <td><StatusBadge status={d.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn ghost sm" style={{ marginRight: 6 }}>View</a>}
                    {d.status === 'pending' && (
                      <>
                        <button className="btn approve sm" onClick={() => onApprove(d.idx)}>Approve</button>{' '}
                        <button className="btn reject sm" onClick={() => onReject(d.idx)}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div>
          <div className="stat-label" style={{ marginBottom: 8 }}>Pending ({pending.length})</div>
          {pending.length === 0 ? <div className="meta">Nothing outstanding.</div> : (
            <table><thead><tr><th>Document</th></tr></thead>
              <tbody>{pending.map((d) => (
                <tr key={d.name}><td>{d.name}<div className="meta" style={{ marginTop: 2 }}>not yet uploaded</div></td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
      {overdue && <div className="notice" style={{ marginTop: 14 }}>Upload window has closed with documents still missing or unreviewed. Follow up with {employee.name.split(' ')[0]} directly.</div>}
    </div>
  );
}

/** Collapsible block inside the employee profile modal. The profile is long — identity, CTC,
 * two document checklists, a month of attendance and credentials all stacked — so everything
 * past "Employee details" is folded away by default, with the header carrying enough of a
 * summary that HR can see whether it's worth opening. Styled with the tool's own `.acc-*`
 * rules in HrToolApp: this repo only compiles Tailwind for the two `*-tailwind.css` pages
 * (see postcss.config.mjs), so utility classes are inert everywhere in /admin. */
function Section({ title, summary, defaultOpen = false, children }: {
  title: string; summary?: ReactNode; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`acc${open ? ' open' : ''}`}>
      <button type="button" className="acc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="acc-text">
          <span className="acc-title">{title}</span>
          {summary ? <span className="acc-sum">{summary}</span> : null}
        </span>
        <span className="acc-chev" aria-hidden="true">▾</span>
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  );
}

function EmployeeProfileModal({ employee, admin, founder, onClose, onEditCtcSplit, onRemove, onConfirmProbation, onExtendProbation, onMarkExited, onEditCredential, onIssueCredential, onApproveDoc, onRejectDoc, onApproveKyc, onRejectKyc, onSaveEdits }: {
  employee: HrEmployee; admin: boolean; founder: boolean; onClose: () => void; onEditCtcSplit: () => void;
  onRemove: () => void; onConfirmProbation: () => void; onExtendProbation: () => void; onMarkExited: () => void;
  onEditCredential: (c: HrEmployeeCredential) => void; onIssueCredential: () => void;
  onApproveDoc: (idx: number) => void; onRejectDoc: (idx: number) => void;
  onApproveKyc: (slotKey: string) => void; onRejectKyc: (slotKey: string) => void;
  onSaveEdits: (updates: Partial<HrEmployee>) => Promise<void>;
}) {
  const { state } = useHrTool();
  const canSeeCTC = admin || state.currentUser?.id === employee.id;
  const credential = employee.credentialId
    ? state.employeeCredentials.find((c) => c.id === employee.credentialId)
    : state.employeeCredentials.find((c) => c.name === employee.name);
  const cs = employee.ctcSplitOverride || state.rules.ctcSplit;

  // Admins land straight in the editable form (clicking a row and clicking "View / Edit →"
  // already open this exact same modal — there was never a second, different view to reconcile,
  // just an extra "Edit details" click in the way every time). Non-admins have no path to
  // toggle editing at all (no such button below), so this has no effect for them — they still
  // get the plain read-only summary.
  const [editing, setEditing] = useState(admin);
  const [viewerDoc, setViewerDoc] = useState<{ name: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    designation: employee.designation, team: employee.team, manager: employee.manager || '',
    doj: employee.doj, email: employee.email === '—' ? '' : employee.email, ctc: String(employee.ctc),
  });

  function startEdit() {
    setForm({
      designation: employee.designation, team: employee.team, manager: employee.manager || '',
      doj: employee.doj, email: employee.email === '—' ? '' : employee.email, ctc: String(employee.ctc),
    });
    setEditing(true);
  }
  async function saveEdit() {
    setSaving(true);
    await onSaveEdits({
      designation: form.designation, team: form.team, manager: form.manager.trim() || null,
      doj: form.doj, email: form.email.trim() || '—', ctc: Number(form.ctc) || 0,
    });
    setSaving(false);
    setEditing(false);
  }

  // Header summaries, so a collapsed section still says what's inside it.
  const docTotal = employee.documents.length;
  const docApproved = employee.documents.filter((d) => d.status === 'approved').length;
  const docUploaded = employee.documents.filter((d) => d.status !== 'not_uploaded').length;
  const docWindowLeft = employee.documentsDeadline ? daysLeft(employee.documentsDeadline) : null;
  const docSummary = !admin
    ? 'Restricted — HR Head/Founder and the employee only'
    : docTotal === 0
      ? 'No document checklist on this record'
      : `${docApproved}/${docTotal} approved · ${docUploaded}/${docTotal} uploaded`
        + (docApproved === docTotal ? '' : docWindowLeft === null ? '' : docWindowLeft < 0 ? ' · window closed' : ` · ${docWindowLeft} day${docWindowLeft === 1 ? '' : 's'} left`);

  const kycSlots = KYC_SECTIONS.flatMap((sec) => sec.slots);
  const kycProvided = kycSlots.filter((slot) => employee.kycDocuments[slot.key]?.status !== 'not_uploaded').length;
  const kycAwaiting = kycSlots.filter((slot) => employee.kycDocuments[slot.key]?.status === 'pending').length;
  const kycSummary = !admin
    ? 'Restricted — HR Head/Founder and the employee only'
    : `${kycProvided}/${kycSlots.length} provided`
      + (kycAwaiting ? ` · ${kycAwaiting} awaiting review` : '')
      + (kycProvided === 0 ? ' · nothing uploaded yet' : '');

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const buttons = editing
    ? [
        { label: 'Cancel', cls: 'btn', onClick: () => setEditing(false) },
        { label: saving ? 'Saving…' : 'Save changes', cls: 'btn primary', onClick: saveEdit },
      ]
    : [{ label: 'Close', cls: 'btn', onClick: onClose }];
  // These stay available regardless of edit state (admins now land straight in the form, so
  // gating them on "not editing" would hide them behind an extra Cancel click every time).
  if (!editing && admin) buttons.unshift({ label: 'Edit details', cls: 'btn', onClick: startEdit });
  if (admin && employee.id !== state.currentUser?.id) buttons.unshift({ label: 'Remove employee', cls: 'btn reject', onClick: onRemove });
  if (admin && employee.status !== 'exited' && employee.id !== state.currentUser?.id) {
    buttons.unshift({ label: 'Mark as exited', cls: 'btn', onClick: onMarkExited });
  }
  if (employee.status === 'probation' && admin) {
    buttons.unshift({ label: 'Extend probation', cls: 'btn', onClick: onExtendProbation });
    buttons.unshift({ label: 'Confirm — move to Active', cls: 'btn approve', onClick: onConfirmProbation });
  }
  return (
    <ModalShell title={employee.name} onClose={onClose} actions={buttons} maxWidth={860}>
      <Section title="Employee details" summary={`${employee.designation} · ${employee.team}${employee.manager ? ` · reports to ${employee.manager}` : ''}`} defaultOpen>
      {editing ? (
        <>
          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Designation</label>
              <select value={form.designation} onChange={(ev) => setForm((f) => ({ ...f, designation: ev.target.value }))}>
                {state.orgStructure.designations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Team</label>
              <select value={form.team} onChange={(ev) => setForm((f) => ({ ...f, team: ev.target.value }))}>
                {state.teams.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Reporting manager</label>
              <input type="text" value={form.manager} onChange={(ev) => setForm((f) => ({ ...f, manager: ev.target.value }))} placeholder="e.g. Kunal Verma" />
            </div>
            <div className="field">
              <label className="field-label">Date of joining</label>
              <input type="date" value={form.doj} onChange={(ev) => setForm((f) => ({ ...f, doj: ev.target.value }))} />
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Email</label>
              <input type="email" value={form.email} onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))} placeholder="name@snf.co" />
            </div>
            {canSeeCTC && (
              <div className="field">
                <label className="field-label">Annual CTC (₹)</label>
                <input type="number" value={form.ctc} onChange={(ev) => setForm((f) => ({ ...f, ctc: ev.target.value }))} />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="field"><label className="field-label">Designation</label>{employee.designation}</div>
          <div className="field"><label className="field-label">Team</label>{employee.team}{employee.manager ? ` · reports to ${employee.manager}` : ''}</div>
          <div className="field"><label className="field-label">Email</label>{employee.email}</div>
          <div className="field"><label className="field-label">Date of Joining</label>{employee.doj}</div>
          <div className="field"><label className="field-label">Status</label><StatusBadge status={employee.status} />{employee.probationExtendedBy ? <span className="meta"> (extended by {employee.probationExtendedBy} days)</span> : null}</div>
          <div className="field"><label className="field-label">Annual CTC</label>{canSeeCTC ? '₹' + employee.ctc.toLocaleString('en-IN') : <span className="meta">Restricted — not visible to Reporting Managers.</span>}</div>
        </>
      )}
      {canSeeCTC && (() => {
        // While editing, follow the unsaved CTC the admin is currently typing — not the last
        // saved value — so this breakdown doesn't sit frozen/stale until they hit Save.
        const liveCtc = editing ? (Number(form.ctc) || 0) : employee.ctc;
        const b = computeCtcBreakdown(liveCtc, cs);
        return (
          <div className="field"><label className="field-label">CTC structure (₹/month)</label>
            Basic ₹{b.basic.toLocaleString('en-IN')} · HRA ₹{b.hra.toLocaleString('en-IN')} · Convenience ₹{b.convenience.toLocaleString('en-IN')} · Special Allowance ₹{b.specialAllowance.toLocaleString('en-IN')}
            {employee.ctcSplitOverride ? <span className="badge pending">Custom</span> : <span className="meta"> (company default)</span>}
            {admin && <button className="btn ghost sm" style={{ marginLeft: 6 }} onClick={onEditCtcSplit}>Edit</button>}
          </div>
        );
      })()}
      <div className="field"><label className="field-label">Leave balance</label>
        {Object.entries(employee.leaveBalance).filter(([k]) => state.rules.leaveTypes[k]?.enabled !== false).map(([k, v]) => <span className="badge active" style={{ marginRight: 6 }} key={k}>{k}: {v}</span>)}
      </div>
      </Section>

      <Section title="Documents" summary={docSummary}>
        {!admin ? (
          <span className="meta">Restricted — visible only to HR Head/Founder and the employee.</span>
        ) : employee.documents.length === 0 ? (
          <span className="meta">No document checklist on this record.</span>
        ) : (
          <>
            {employee.documentsDeadline && (() => {
              const dl = daysLeft(employee.documentsDeadline!);
              const allApproved = employee.documents.every((d) => d.status === 'approved');
              return (
                <div className="meta" style={{ marginBottom: 6 }}>
                  Window {employee.doj} → {employee.documentsDeadline} ·{' '}
                  {allApproved ? <span style={{ color: 'var(--green, #166534)', fontWeight: 600 }}>all docs approved</span>
                    : dl !== null && dl < 0 ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>window closed</span>
                    : <span style={{ fontWeight: 600 }}>{dl} day{dl === 1 ? '' : 's'} left</span>}
                </div>
              );
            })()}
          {(() => {
            const indexed = employee.documents.map((d, i) => ({ ...d, idx: i }));
            const provided = indexed.filter((d) => d.status !== 'not_uploaded');
            const pending = indexed.filter((d) => d.status === 'not_uploaded');
            return (
              <div className="grid grid-2">
                <div>
                  <div className="stat-label" style={{ marginBottom: 8 }}>Provided ({provided.length})</div>
                  {provided.length === 0 ? <div className="meta">Nothing uploaded yet.</div> : (
                    <table><thead><tr><th>Document</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                      <tbody>{provided.map((d) => (
                        <tr key={d.name}>
                          <td>
                            {d.name}
                            {d.status === 'rejected' && d.remarks && <div className="meta" style={{ color: 'var(--red)', marginTop: 2 }}>Rejected: {d.remarks}</div>}
                            {d.uploadedAt && <div className="meta" style={{ marginTop: 2 }}>Uploaded {d.uploadedAt}</div>}
                          </td>
                          <td><StatusBadge status={d.status} /></td>
                          <td style={{ textAlign: 'right' }}>
                            {d.url && <button className="btn ghost sm" style={{ marginRight: 6 }} onClick={() => setViewerDoc({ name: d.name, url: d.url! })}>View</button>}
                            {d.status === 'pending' && (
                              <>
                                <button className="btn approve sm" onClick={() => onApproveDoc(d.idx)}>Approve</button>{' '}
                                <button className="btn reject sm" onClick={() => onRejectDoc(d.idx)}>Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div className="stat-label" style={{ marginBottom: 8 }}>Pending ({pending.length})</div>
                  {pending.length === 0 ? <div className="meta">Nothing outstanding.</div> : (
                    <table><thead><tr><th>Document</th></tr></thead>
                      <tbody>{pending.map((d) => (
                        <tr key={d.name}><td>{d.name}<div className="meta" style={{ marginTop: 2 }}>not yet uploaded</div></td></tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
          </>
        )}
      </Section>

      <Section title="KYC & personal documents" summary={kycSummary}>
        {!admin ? (
          <span className="meta">Restricted — visible only to HR Head/Founder and the employee.</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {KYC_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="stat-label" style={{ marginBottom: 6 }}>{section.title}</div>
                <div className="table-scroll wrap-table">
                <table><thead><tr><th>Document</th><th>Details</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                  <tbody>{section.slots.map((slot) => {
                    const d = employee.kycDocuments[slot.key];
                    return (
                      <tr key={slot.key}>
                        <td>
                          {slot.label}{slot.required && ' *'}
                          {d.status === 'rejected' && d.remarks && <div className="meta" style={{ color: 'var(--red)', marginTop: 2 }}>Rejected: {d.remarks}</div>}
                          {d.uploadedAt && d.status !== 'not_uploaded' && <div className="meta" style={{ marginTop: 2 }}>Uploaded {d.uploadedAt}</div>}
                        </td>
                        <td className="meta">
                          {slot.fields.map((f) => d.fields[f.key]).filter(Boolean).length > 0
                            ? slot.fields.map((f) => d.fields[f.key] ? `${f.label}: ${d.fields[f.key]}` : null).filter(Boolean).join(' · ')
                            : '—'}
                        </td>
                        <td><StatusBadge status={d.status} /></td>
                        <td style={{ textAlign: 'right' }}>
                          {d.url && <button className="btn ghost sm" style={{ marginRight: 6 }} onClick={() => setViewerDoc({ name: slot.label, url: d.url! })}>View</button>}
                          {d.status === 'pending' && (
                            <>
                              <button className="btn approve sm" onClick={() => onApproveKyc(slot.key)}>Approve</button>{' '}
                              <button className="btn reject sm" onClick={() => onRejectKyc(slot.key)}>Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {admin && (
        <Section title="Attendance calendar" summary={`${monthLabel} — present, absent, leave and week-off totals with a day-by-day grid`}>
          <AttendanceCalendar empName={employee.name} />
        </Section>
      )}
      {founder && (
        <Section title="Login & credentials" summary={credential ? `${credential.employeeCode} · ${credential.isActive ? 'Active' : 'Inactive'}` : 'No login issued yet'}>
          {credential ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <code>{credential.employeeCode}</code>
              {credential.panelRole && <span className="badge active">{PANEL_ROLE_LABEL[credential.panelRole]}</span>}
              <span className={`badge ${credential.isActive ? 'active' : 'exited'}`}>{credential.isActive ? 'Active' : 'Inactive'}</span>
              <button className="btn ghost sm" onClick={() => onEditCredential(credential)}>Edit</button>
            </div>
          ) : (
            <div>
              <span className="meta">No login issued yet.</span>{' '}
              <button className="btn ghost sm" onClick={onIssueCredential}>Issue Employee ID</button>
            </div>
          )}
        </Section>
      )}
      {viewerDoc && <DocumentViewer doc={viewerDoc} onClose={() => setViewerDoc(null)} />}
    </ModalShell>
  );
}

/** Full-screen-ish preview for an uploaded document. Opens over the profile modal at 80% of the
 * viewport, which is the point — the old plain "View/Download" link opened a new browser tab, so
 * reviewing five documents meant five tabs and losing your place in the profile each time.
 * PDFs and images render inline; anything else (a .docx, say) can't be previewed by the browser,
 * so that case is told plainly rather than showing an empty frame. */
function DocumentViewer({ doc, onClose }: { doc: { name: string; url: string }; onClose: () => void }) {
  const ext = (doc.url.split('?')[0].split('.').pop() || '').toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  return (
    <div className="doc-viewer-backdrop" onClick={onClose} role="presentation">
      <div className="doc-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="doc-viewer-head">
          <div className="doc-viewer-title">{doc.name}</div>
          <div className="doc-viewer-actions">
            <a className="btn sm" href={doc.url} target="_blank" rel="noopener noreferrer" download>⇩ Download</a>
            <button className="btn sm" onClick={onClose} aria-label="Close document preview">✕ Close</button>
          </div>
        </div>
        <div className="doc-viewer-body">
          {isImage ? (
            /* next/image can't serve arbitrary uploaded S3 URLs without whitelisting every
               bucket host, and this is a one-off preview behind an admin modal, never an LCP
               image. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.url} alt={doc.name} className="doc-viewer-img" />
          ) : isPdf ? (
            <iframe src={doc.url} title={doc.name} className="doc-viewer-frame" />
          ) : (
            <div className="doc-viewer-fallback">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>This file type can&apos;t be previewed in the browser.</div>
              <div className="meta" style={{ marginBottom: 12 }}>Download it to open in the right application.</div>
              <a className="btn primary sm" href={doc.url} target="_blank" rel="noopener noreferrer" download>⇩ Download {doc.name}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CtcSplitModal({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { state, persistEmployees, logRuleChange } = useHrTool();
  const e = state.employees.find((x) => x.id === employeeId)!;
  const cs = e.ctcSplitOverride || state.rules.ctcSplit;
  const [basicPct, setBasicPct] = useState(String(cs.basicPct));
  const [hraPct, setHraPct] = useState(String(cs.hraPctOfBasic));
  const [convType, setConvType] = useState<'amount' | 'percent'>(cs.convenienceType);
  const [convValue, setConvValue] = useState(String(cs.convenienceValue));

  // Live preview against the (unsaved) draft values above, so admin sees the effect on this
  // employee's actual CTC before clicking Save.
  const preview = computeCtcBreakdown(e.ctc, {
    basicPct: Number(basicPct) || 0, hraPctOfBasic: Number(hraPct) || 0,
    convenienceType: convType, convenienceValue: Number(convValue) || 0,
  });

  async function save() {
    const b = Number(basicPct) || 0, h = Number(hraPct) || 0, c = Number(convValue) || 0;
    if (b <= 0 || b > 100) { alert('Basic must be between 0 and 100% of monthly salary.'); return; }
    if (h < 0 || h > 100) { alert('HRA must be between 0 and 100% of Basic.'); return; }
    if (c < 0) { alert('Convenience Allowance cannot be negative.'); return; }
    if (convType === 'percent' && c > 100) { alert('Convenience Allowance % must be between 0 and 100.'); return; }
    if (preview.specialAllowance < 0) {
      alert(`Basic + HRA + Convenience (₹${(preview.basic + preview.hra + preview.convenience).toLocaleString('en-IN')}/month) is more than ${e.name.split(' ')[0]}'s monthly salary (₹${Math.round(e.ctc / 12).toLocaleString('en-IN')}) — Special Allowance can't go negative. Lower Basic, HRA, or Convenience first.`);
      return;
    }
    await persistEmployees(state.employees.map((x) => (x.id === employeeId
      ? { ...x, ctcSplitOverride: { basicPct: b, hraPctOfBasic: h, convenienceType: convType, convenienceValue: c } }
      : x)));
    logRuleChange(`Set custom CTC structure for ${e.name}: Basic ${b}% / HRA ${h}% of Basic / Convenience ${convType === 'amount' ? '₹' + c : c + '%'}`);
    onClose();
  }
  async function resetDefault() {
    await persistEmployees(state.employees.map((x) => (x.id === employeeId ? { ...x, ctcSplitOverride: null } : x)));
    logRuleChange(`Reset ${e.name}'s CTC structure to company default`);
    onClose();
  }

  return (
    <ModalShell title={'CTC structure — ' + e.name} onClose={onClose} actions={[
      { label: 'Reset to company default', cls: 'btn', onClick: resetDefault },
      { label: 'Cancel', cls: 'btn', onClick: onClose },
      { label: 'Save', cls: 'btn primary', onClick: save },
    ]}>
      <div className="notice info">Overrides the company default just for {e.name.split(' ')[0]}. Special Allowance is always whatever&apos;s left — not set directly.</div>
      <div className="field"><label className="field-label">Basic (% of monthly salary)</label><input className="mini-input" type="number" value={basicPct} onChange={(ev) => setBasicPct(ev.target.value)} />%</div>
      <div className="field"><label className="field-label">HRA (% of Basic)</label><input className="mini-input" type="number" value={hraPct} onChange={(ev) => setHraPct(ev.target.value)} />% of Basic</div>
      <div className="field">
        <label className="field-label">Convenience Allowance</label>
        <select value={convType} onChange={(ev) => setConvType(ev.target.value as 'amount' | 'percent')} style={{ marginRight: 8 }}>
          <option value="amount">Amount</option>
          <option value="percent">%</option>
        </select>
        {convType === 'amount' && '₹'}
        <input className="mini-input" type="number" value={convValue} onChange={(ev) => setConvValue(ev.target.value)} />
        {convType === 'percent' && '%'}
      </div>
      <div className="field">
        <label className="field-label">Special Allowance (₹/month)</label>
        <input
          className="mini-input"
          type="text"
          value={'₹' + preview.specialAllowance.toLocaleString('en-IN')}
          readOnly
          disabled
          style={{ width: 110, ...(preview.specialAllowance < 0 ? { color: 'var(--red)', borderColor: '#FECACA' } : {}) }}
        />
        <span className="meta" style={{ marginLeft: 8 }}>— computed automatically, whatever&apos;s left of monthly salary</span>
      </div>
      <div className="meta" style={{ marginTop: 8 }}>
        On {e.name.split(' ')[0]}&apos;s ₹{e.ctc.toLocaleString('en-IN')} annual CTC (₹/month): Basic ₹{preview.basic.toLocaleString('en-IN')}
        {' · '}HRA ₹{preview.hra.toLocaleString('en-IN')}
        {' · '}Convenience ₹{preview.convenience.toLocaleString('en-IN')}
        {' · '}Special Allowance ₹{preview.specialAllowance.toLocaleString('en-IN')}
      </div>
      {preview.specialAllowance < 0 && (
        <div className="notice" style={{ marginTop: 10, background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>
          Special Allowance can&apos;t go negative — Basic + HRA + Convenience already adds up to more than {e.name.split(' ')[0]}&apos;s monthly salary. Lower Basic, HRA, or Convenience before saving.
        </div>
      )}
    </ModalShell>
  );
}

/** HR queue for employees asking to have a closed document-upload window reopened. Fetched here
 * rather than added to the bootstrap payload: it's admin-only, rarely non-empty, and keeping it
 * out of the shared state means an approval can't invalidate everything else on the screen.
 * Approving pushes that employee's documents_deadline forward server-side. */
function DocumentUploadRequests({ currentUser }: { currentUser: string }) {
  interface DocReq {
    id: number; emp: string; reason: string; status: 'pending' | 'approved' | 'rejected';
    requestedAt: string; decidedBy: string | null; remarks: string | null; grantedUntil: string | null;
  }
  const [rows, setRows] = useState<DocReq[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/admin/hr-tool/document-upload-requests');
      const json = await res.json();
      if (json?.success) setRows(json.data || []);
    } catch { /* leave the section empty rather than breaking the Directory */ }
  }
  useEffect(() => { load(); }, []);

  async function decide(id: number, decision: 'approved' | 'rejected') {
    setBusyId(id);
    setErr('');
    try {
      const res = await fetch('/api/admin/hr-tool/document-upload-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, decidedBy: currentUser }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Could not record the decision.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record the decision.');
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows.filter((r) => r.status === 'pending');
  if (rows.length === 0) return null;

  return (
    <section className="block" style={{ marginTop: 16 }}>
      <div className="block-head">
        <h2>Document upload requests{pending.length > 0 ? ` (${pending.length} pending)` : ''}</h2>
      </div>
      {err && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{err}</div>}
      <div className="card"><div className="table-scroll wrap-table">
        <table>
          <thead><tr><th>Employee</th><th>Reason</th><th>Requested</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td>{r.emp}</td>
              <td>{r.reason}</td>
              <td className="meta">{r.requestedAt.slice(0, 10)}</td>
              <td>
                <StatusBadge status={r.status} />
                {r.status === 'approved' && r.grantedUntil && <div className="meta" style={{ marginTop: 2 }}>Window reopened to {r.grantedUntil}</div>}
                {r.decidedBy && <div className="meta" style={{ marginTop: 2 }}>by {r.decidedBy}</div>}
              </td>
              <td style={{ textAlign: 'right' }}>
                {r.status === 'pending' ? (
                  <>
                    <button className="btn approve sm" disabled={busyId === r.id} onClick={() => decide(r.id, 'approved')}>Approve</button>{' '}
                    <button className="btn reject sm" disabled={busyId === r.id} onClick={() => decide(r.id, 'rejected')}>Reject</button>
                  </>
                ) : <span className="meta">—</span>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>
    </section>
  );
}
