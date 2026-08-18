'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { getAuthHeaders } from '@/lib/admin-auth';
import { mergeTemplate, nextEmployeeId, todayStr } from '../utils';
import { CredentialFields, nextEmployeeCode, validateCredentialFields, type CredentialFormState } from './CredentialFields';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

function DesignationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { state, persistDesignations, logRuleChange } = useHrTool();
  return (
    <select value={value} onChange={async (e) => {
      if (e.target.value === '__add_new__') {
        const name = prompt('New designation name (this gets added to Organisation Structure for future use too):');
        if (name && name.trim()) {
          if (!state.orgStructure.designations.includes(name.trim())) {
            await persistDesignations([...state.orgStructure.designations, name.trim()]);
            logRuleChange(`Added designation: ${name.trim()}`);
          }
          onChange(name.trim());
        }
        return;
      }
      onChange(e.target.value);
    }}>
      <option value="">— Select —</option>
      {state.orgStructure.designations.map((d) => <option key={d} value={d}>{d}</option>)}
      <option value="__add_new__">+ Add new designation…</option>
    </select>
  );
}

interface FormState extends CredentialFormState {
  name: string;
  email: string;
  designation: string;
  team: string;
  ctc: string;
  doj: string;
}

function emptyForm(state: ReturnType<typeof useHrTool>['state']): FormState {
  return {
    name: '', email: '', designation: '', team: state.teams[0]?.name || '', ctc: '', doj: todayStr(),
    employeeCode: nextEmployeeCode(state.employeeCredentials), avatarUrl: '',
    password: '', confirmPassword: '', panelRole: '', linkedPanelAdminId: '',
  };
}

/** Self-contained "+ Send offer letter" button — the single place a new employee gets
 * created. Replaces the old two-step "draft an offer letter that goes nowhere" +
 * "separately assign an Employee ID" flow: this collects everything once (offer letter
 * fields and Employee ID/credential fields share one form, no field asked twice) and, on
 * approval, creates the login AND the Directory record together — no more employees who
 * exist in one place but not the other. Shared by Employee Directory and Onboarding. */
export default function HireEmployeeButton({ label, className }: { label: string; className: string }) {
  const { state, persistEmployees, upsertEmployeeCredentialInState } = useHrTool();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(state));
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<FormState | null>(null);
  const [sending, setSending] = useState(false);

  function patch(p: Partial<FormState>) { setForm((f) => ({ ...f, ...p })); }

  function openAdd() {
    setForm(emptyForm(state));
    setError('');
    setAddOpen(true);
  }

  function previewOffer() {
    if (!form.name.trim()) { setError("Please enter the employee's full name."); return; }
    if (!form.designation) { setError('Please choose a designation.'); return; }
    if (!form.doj) { setError('Please enter their date of joining.'); return; }
    const credError = validateCredentialFields(form, false);
    if (credError) { setError(credError); return; }
    setError('');
    setAddOpen(false);
    setPreview(form);
  }

  async function approveAndSend() {
    if (!preview) return;
    setSending(true);
    setError('');
    try {
      const credBody = {
        name: preview.name.trim(), employeeCode: preview.employeeCode.trim(), designation: preview.designation,
        email: preview.email.trim() || null, avatarUrl: preview.avatarUrl || null, password: preview.password,
        panelRole: preview.panelRole || null, linkedPanelAdminId: preview.linkedPanelAdminId || null,
      };
      const res = await fetch('/api/admin/hr-tool/employee-credentials', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(credBody) });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Failed to create Employee ID'); return; }
      const credential = data.data as HrEmployeeCredential;
      upsertEmployeeCredentialInState(credential);

      const ctc = Number(preview.ctc) || 0;
      const today = todayStr();
      const manager = state.teams.find((t) => t.name === preview.team)?.manager || null;
      const offerMerged = mergeTemplate(state.templates['Offer Letter']?.content || '', {
        employee_name: preview.name, designation: preview.designation, team: preview.team, ctc: '₹' + ctc.toLocaleString('en-IN'),
      });
      const newEmployee = {
        id: nextEmployeeId(state.employees), credentialId: credential.id, name: preview.name.trim(),
        email: preview.email.trim() || '—', designation: preview.designation, team: preview.team, manager,
        status: 'active', doj: preview.doj, sysRole: 'Employee', ctc,
        leaveBalance: { Casual: 6, Sick: 6, Earned: 10 }, documents: [],
        signedDocs: [{ type: 'Offer Letter', content: offerMerged, signedDate: today }],
      };
      await persistEmployees([...state.employees, newEmployee]);

      setPreview(null);
    } catch {
      setError('An error occurred while creating this employee');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button className={className} onClick={openAdd}>{label}</button>

      {addOpen && (
        <ModalShell title="Send offer letter" onClose={() => setAddOpen(false)} maxWidth={640} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setAddOpen(false) },
          { label: 'Preview offer letter', cls: 'btn primary', onClick: previewOffer },
        ]}>
          <div className="notice info">Fill in the details once — this creates both their offer letter and their Employee ID/login together. Preview exactly what they&apos;ll see before anything is finalized.</div>
          {error && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{error}</div>}

          <div className="field"><label className="field-label">Full name</label><input type="text" placeholder="e.g. Kavita Rao" value={form.name} onChange={(e) => patch({ name: e.target.value })} /></div>

          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Designation</label>
              <DesignationSelect value={form.designation} onChange={(v) => patch({ designation: v })} />
            </div>
            <div className="field">
              <label className="field-label">Team</label>
              <select value={form.team} onChange={(e) => patch({ team: e.target.value })}>{state.teams.map((t) => <option key={t.name}>{t.name}</option>)}</select>
            </div>
          </div>

          <div className="field-grid-2">
            <div className="field"><label className="field-label">Email (optional)</label><input type="email" placeholder="name@snf.co" value={form.email} onChange={(e) => patch({ email: e.target.value })} /></div>
            <div className="field"><label className="field-label">Annual CTC (₹)</label><input type="number" placeholder="e.g. 480000" value={form.ctc} onChange={(e) => patch({ ctc: e.target.value })} /></div>
          </div>

          <CredentialFields
            form={form} onChange={patch} isEdit={false} showAvatar={false}
            idRowExtra={
              <div className="field"><label className="field-label">Date of joining</label><input type="date" value={form.doj} onChange={(e) => patch({ doj: e.target.value })} /></div>
            }
          />
        </ModalShell>
      )}

      {preview && (
        <ModalShell title="Preview — Offer Letter" onClose={() => setPreview(null)} actions={[
          { label: 'Back to edit', cls: 'btn', onClick: () => { setAddOpen(true); setPreview(null); }, },
          { label: sending ? 'Creating…' : 'Approve & Send', cls: 'btn primary', onClick: approveAndSend },
        ]}>
          <div className="notice info">This is exactly what {preview.name.split(' ')[0]} will see. Approving creates their Employee ID/login and Directory record right away — nothing is emailed.</div>
          {error && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{error}</div>}
          <div className="card pad" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
            {mergeTemplate(state.templates['Offer Letter']?.content || '', { employee_name: preview.name, designation: preview.designation, team: preview.team, ctc: '₹' + (Number(preview.ctc) || 0).toLocaleString('en-IN') })}
          </div>
          <div className="meta" style={{ marginTop: 10 }}>Employee ID: <code>{preview.employeeCode}</code> · Date of joining: {preview.doj}</div>
        </ModalShell>
      )}
    </>
  );
}
