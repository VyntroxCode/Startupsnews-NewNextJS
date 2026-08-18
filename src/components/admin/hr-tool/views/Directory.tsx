'use client';

import { useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import HireEmployeeButton from './HireEmployeeButton';
import EditCredentialModal from './EditCredentialModal';
import { PANEL_ROLE_LABEL } from './CredentialFields';
import { StatusBadge, exportCSV, exportExcel, initials, isAdmin, nextEmployeeId, todayStr } from '../utils';
import type { HrEmployee } from '../types';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

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
  const { state, persistEmployees, persistTeams, persistDesignations, logRuleChange, upsertEmployeeCredentialInState } = useHrTool();
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

  const admin = isAdmin(state.role);
  const founder = state.role === 'Founder';

  const visibleEmployees = useMemo(() => {
    if (admin) return state.employees;
    if (state.role === 'Reporting Manager') return state.employees.filter((e) => e.team === state.currentUser?.team);
    return state.employees.filter((e) => e.id === state.currentUser?.id);
  }, [state.employees, state.role, state.currentUser, admin]);

  const rows = useMemo(() => visibleEmployees.filter((e) =>
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.designation.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || e.status === statusFilter) && (!teamFilter || e.team === teamFilter)
  ), [visibleEmployees, search, statusFilter, teamFilter]);

  // Employee IDs issued (e.g. via the old Assigning IDs flow, or a partial failure right after
  // hiring) that never got a matching Directory record — the exact bug class this merge fixes,
  // made self-healing instead of silently recurring. Matches by credentialId first, name second.
  const orphanCredentials = useMemo(() => founder
    ? state.employeeCredentials.filter((c) => c.isActive &&
        !state.employees.some((e) => e.credentialId === c.id || e.name === c.name))
    : [], [state.employeeCredentials, state.employees, founder]);

  async function addOrphanToDirectory(c: HrEmployeeCredential) {
    setAddingOrphanId(c.id);
    const newEmployee: HrEmployee = {
      id: nextEmployeeId(state.employees), credentialId: c.id, name: c.name, email: c.email || '—',
      designation: c.designation, team: state.teams[0]?.name || '', manager: null, status: 'active',
      doj: new Date(c.createdAt).toISOString().slice(0, 10), sysRole: 'Employee', ctc: 0,
      leaveBalance: { Casual: 6, Sick: 6, Earned: 10 }, documents: [], signedDocs: [],
    };
    await persistEmployees([...state.employees, newEmployee]);
    logRuleChange(`Added ${c.name} to Directory from an existing Employee ID (${c.employeeCode})`);
    setAddingOrphanId(null);
  }

  function exportDirectory(fmt: 'csv' | 'excel') {
    const exportRows: (string | number)[][] = [['Name', 'Email', 'Designation', 'Team', 'Status', 'DOJ', 'Annual CTC']];
    visibleEmployees.forEach((e) => exportRows.push([e.name, e.email, e.designation, e.team, e.status, e.doj, e.ctc]));
    if (fmt === 'csv') exportCSV('employee_directory.csv', exportRows); else exportExcel('employee_directory.xlsx', exportRows);
  }

  async function removeEmployeeRecord(e: HrEmployee) {
    if (!confirm(`Remove ${e.name} from the Directory? This is for correcting mistaken entries — for a real exit, use Offboarding instead. This can't be undone.`)) return;
    await persistTeams(state.teams.map((t) => (t.manager === e.name ? { ...t, manager: null } : t)));
    await persistEmployees(state.employees.filter((x) => x.id !== e.id));
    logRuleChange(`Removed employee record: ${e.name}`);
    setProfileId(null);
  }
  async function confirmProbation(e: HrEmployee) {
    await persistEmployees(state.employees.map((x) => (x.id === e.id ? { ...x, status: 'active', leaveBalance: { Casual: 6, Sick: 6, Earned: 10 } } : x)));
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
      employees = [...employees, {
        id: newId, name, email: email || '—', designation: designation || '—', team: team || state.teams[0]?.name || '',
        manager: manager || null, status: 'active', doj: doj || todayStr(), sysRole: 'Employee', ctc: Number(ctc) || 0,
        leaveBalance: { Casual: 6, Sick: 6, Earned: 10 }, documents: [], signedDocs: [],
      }];
      count++;
    }
    if (designations !== state.orgStructure.designations) await persistDesignations(designations);
    await persistEmployees(employees);
    setBulkOpen(false);
    alert(`${count} employee(s) imported. No login was created — open each profile and click "Issue Employee ID" to give them one.`);
  }

  const profile = profileId ? state.employees.find((e) => e.id === profileId) || null : null;

  return (
    <>
      <PageHead title="Employee Directory" sub={admin ? "Search, filter, and open any employee's full profile." : "Your team only — sibling departments aren't visible here."} />

      {orphanCredentials.length > 0 && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <div>
            <strong>{orphanCredentials.length} Employee ID{orphanCredentials.length > 1 ? 's have' : ' has'} no Directory record.</strong> Someone was issued a login but never got a Directory entry — add them to finish setup (you can set their salary afterwards from Payroll).
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {orphanCredentials.map((c) => (
              <button key={c.id} className="btn sm" disabled={addingOrphanId === c.id} onClick={() => addOrphanToDirectory(c)}>
                {addingOrphanId === c.id ? 'Adding…' : `+ Add ${c.name}`}
              </button>
            ))}
          </div>
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
      <div className="card"><table><thead><tr><th>Name</th><th>Designation</th><th>Team</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td><div className="row-name"><div className="avatar">{initials(e.name)}</div><div><div>{e.name}</div><div className="meta">{e.email}</div></div></div></td>
              <td>{e.designation}</td><td>{e.team}</td><td><StatusBadge status={e.status} /></td>
              <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => setProfileId(e.id)}>View profile →</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5}><div className="empty">No employees match this search.</div></td></tr>}
        </tbody>
      </table></div>

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

function EmployeeProfileModal({ employee, admin, founder, onClose, onEditCtcSplit, onRemove, onConfirmProbation, onExtendProbation, onMarkExited, onEditCredential, onIssueCredential }: {
  employee: HrEmployee; admin: boolean; founder: boolean; onClose: () => void; onEditCtcSplit: () => void;
  onRemove: () => void; onConfirmProbation: () => void; onExtendProbation: () => void; onMarkExited: () => void;
  onEditCredential: (c: HrEmployeeCredential) => void; onIssueCredential: () => void;
}) {
  const { state } = useHrTool();
  const canSeeCTC = admin || state.currentUser?.id === employee.id;
  const credential = employee.credentialId
    ? state.employeeCredentials.find((c) => c.id === employee.credentialId)
    : state.employeeCredentials.find((c) => c.name === employee.name);
  const cs = employee.ctcSplitOverride || state.rules.ctcSplit;
  const buttons = [{ label: 'Close', cls: 'btn', onClick: onClose }];
  if (admin && employee.id !== state.currentUser?.id) buttons.unshift({ label: 'Remove employee', cls: 'btn reject', onClick: onRemove });
  if (admin && employee.status !== 'exited' && employee.id !== state.currentUser?.id) {
    buttons.unshift({ label: 'Mark as exited', cls: 'btn', onClick: onMarkExited });
  }
  if (employee.status === 'probation' && admin) {
    buttons.unshift({ label: 'Extend probation', cls: 'btn', onClick: onExtendProbation });
    buttons.unshift({ label: 'Confirm — move to Active', cls: 'btn approve', onClick: onConfirmProbation });
  }
  return (
    <ModalShell title={employee.name} onClose={onClose} actions={buttons}>
      <div className="field"><label className="field-label">Designation</label>{employee.designation}</div>
      <div className="field"><label className="field-label">Team</label>{employee.team}{employee.manager ? ` · reports to ${employee.manager}` : ''}</div>
      <div className="field"><label className="field-label">Date of Joining</label>{employee.doj}</div>
      <div className="field"><label className="field-label">Status</label><StatusBadge status={employee.status} />{employee.probationExtendedBy ? <span className="meta"> (extended by {employee.probationExtendedBy} days)</span> : null}</div>
      <div className="field"><label className="field-label">Annual CTC</label>{canSeeCTC ? '₹' + employee.ctc.toLocaleString('en-IN') : <span className="meta">Restricted — not visible to Reporting Managers.</span>}</div>
      {canSeeCTC && (
        <div className="field"><label className="field-label">CTC split</label>Basic {cs.basic}% · HRA {cs.hra}% · Allowances {cs.allowances}%
          {employee.ctcSplitOverride ? <span className="badge pending">Custom</span> : <span className="meta"> (company default)</span>}
          {admin && <button className="btn ghost sm" style={{ marginLeft: 6 }} onClick={onEditCtcSplit}>Edit</button>}
        </div>
      )}
      <div className="field"><label className="field-label">Leave balance</label>
        {Object.entries(employee.leaveBalance).filter(([k]) => state.rules.leaveTypes[k] !== false).map(([k, v]) => <span className="badge active" style={{ marginRight: 6 }} key={k}>{k}: {v}</span>)}
      </div>
      <div className="field"><label className="field-label">Document vault</label><span className="meta">Restricted — visible only to HR Head/Founder and the employee.</span></div>
      {founder && (
        <div className="field">
          <label className="field-label">Login &amp; credentials</label>
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
        </div>
      )}
    </ModalShell>
  );
}

function CtcSplitModal({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { state, persistEmployees, logRuleChange } = useHrTool();
  const e = state.employees.find((x) => x.id === employeeId)!;
  const cs = e.ctcSplitOverride || state.rules.ctcSplit;
  const [basic, setBasic] = useState(String(cs.basic));
  const [hra, setHra] = useState(String(cs.hra));
  const [allow, setAllow] = useState(String(cs.allowances));

  async function save() {
    const b = Number(basic) || 0, h = Number(hra) || 0, a = Number(allow) || 0;
    if (b + h + a !== 100) { alert(`Basic + HRA + Allowances must add up to 100%. Currently: ${b + h + a}%`); return; }
    await persistEmployees(state.employees.map((x) => (x.id === employeeId ? { ...x, ctcSplitOverride: { basic: b, hra: h, allowances: a } } : x)));
    logRuleChange(`Set custom CTC split for ${e.name}: Basic ${b}% / HRA ${h}% / Allowances ${a}%`);
    onClose();
  }
  async function resetDefault() {
    await persistEmployees(state.employees.map((x) => (x.id === employeeId ? { ...x, ctcSplitOverride: null } : x)));
    logRuleChange(`Reset ${e.name}'s CTC split to company default`);
    onClose();
  }

  return (
    <ModalShell title={'CTC split — ' + e.name} onClose={onClose} actions={[
      { label: 'Reset to company default', cls: 'btn', onClick: resetDefault },
      { label: 'Cancel', cls: 'btn', onClick: onClose },
      { label: 'Save', cls: 'btn primary', onClick: save },
    ]}>
      <div className="notice info">Overrides the company default just for {e.name.split(' ')[0]}. Must add up to 100%.</div>
      <div className="rule-inputs">
        Basic <input className="mini-input" type="number" value={basic} onChange={(ev) => setBasic(ev.target.value)} />%
        HRA <input className="mini-input" type="number" value={hra} onChange={(ev) => setHra(ev.target.value)} />%
        Allowances <input className="mini-input" type="number" value={allow} onChange={(ev) => setAllow(ev.target.value)} />%
      </div>
    </ModalShell>
  );
}
