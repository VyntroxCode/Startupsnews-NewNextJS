'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { getAuthHeaders } from '@/lib/admin-auth';
import { addDays, buildOfferLetterContent, mergeTemplate, nextEmployeeId, todayStr, type OfferLetterData } from '../utils';
import { JoiningLetterView } from './JoiningLetterView';
import { generateJoiningLetterPdf, generatePlainLetterPdf, triggerPdfDownload } from '../joiningLetterPdf';

/** How many days a new hire has to submit their required-documents checklist, counted from doj. */
const DOCUMENTS_WINDOW_DAYS = 5;
import { copyToClipboard, CredentialFields, EmployeeIdField, nextEmployeeCode, validateCredentialFields, type CredentialFormState } from './CredentialFields';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';
import { emptyKycDocuments } from '../types';

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
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  designation: string;
  team: string;
  /** Optional override of the Department's configured manager — blank falls back to that. */
  reportingManager: string;
  ctc: string;
  doj: string;
}

/** First + last name are collected separately (the form UI) but everywhere else — the offer
 * letter, the Directory record, the greeting — only ever wants one combined display name. */
function fullNameOf(p: { firstName: string; lastName: string }): string {
  return `${p.firstName.trim()} ${p.lastName.trim()}`.trim();
}

/** The Reporting Manager field is an explicit optional override — blank means "use whoever is
 * configured as this Department's manager", same as before this field existed. */
function managerOf(p: { reportingManager: string; team: string }, state: ReturnType<typeof useHrTool>['state']): string | null {
  return p.reportingManager.trim() || state.teams.find((t) => t.name === p.team)?.manager || null;
}

function emptyForm(state: ReturnType<typeof useHrTool>['state']): FormState {
  return {
    firstName: '', lastName: '', email: '', contact: '', designation: '', team: state.teams[0]?.name || '', reportingManager: '',
    ctc: '', doj: todayStr(),
    employeeCode: nextEmployeeCode(state.employeeCredentials), avatarUrl: '',
    password: '', confirmPassword: '', panelRole: '', linkedPanelAdminId: '',
  };
}

/** Self-contained "+ Send offer letter" button — the single place a new employee gets
 * created. Replaces the old two-step "draft an offer letter that goes nowhere" +
 * "separately assign an Employee ID" flow: this collects everything once (offer letter
 * fields and Employee ID/credential fields share one form, no field asked twice) and, on
 * approval, creates the login AND the Directory record together — no more employees who
 * exist in one place but not the other. Shared by Directory and Onboarding. */
export default function HireEmployeeButton({ label, className }: { label: string; className: string }) {
  const { state, persistEmployees, upsertEmployeeCredentialInState, logRuleChange } = useHrTool();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(state));
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<FormState | null>(null);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function patch(p: Partial<FormState>) { setForm((f) => ({ ...f, ...p })); }

  /** Structured data behind the default generated letter — shared by the plain-text version
   * (email body / custom-template merge tags), the on-screen structured preview, and the PDF
   * download, so all three always agree. */
  function letterDataFor(p: FormState): OfferLetterData {
    const ctc = Number(p.ctc) || 0;
    const manager = managerOf(p, state);
    const requiredDocuments = state.orgStructure.requiredDocuments;
    const documentsDeadline = requiredDocuments.length ? addDays(p.doj, DOCUMENTS_WINDOW_DAYS) : null;
    return {
      employeeName: fullNameOf(p), employeeCode: p.employeeCode.trim(), password: p.password, designation: p.designation, team: p.team,
      manager, ctc, doj: p.doj, documentsDeadline, requiredDocuments, rules: state.rules,
    };
  }

  /** Whether HR has drafted a fully custom "Offer Letter" template in Company Profile — when
   * they have, that freeform text wins everywhere (preview, email, PDF) instead of the
   * structured default. */
  function hasCustomTemplate(): boolean {
    return !!state.templates['Offer Letter']?.content?.trim();
  }

  /** The letter text shown in preview and saved/emailed on approval. Honours a custom "Offer
   * Letter" draft from Company Profile if HR has written one; otherwise falls back to the full
   * generated letter (letterhead, compensation breakdown, work terms, document checklist). */
  function offerLetterFor(p: FormState): string {
    const customDraft = state.templates['Offer Letter']?.content?.trim();
    if (customDraft) {
      const ctc = Number(p.ctc) || 0;
      return mergeTemplate(customDraft, {
        employee_name: fullNameOf(p), designation: p.designation, team: p.team, ctc: '₹' + ctc.toLocaleString('en-IN'),
        employee_code: p.employeeCode.trim(), password: p.password,
      });
    }
    return buildOfferLetterContent(letterDataFor(p));
  }

  /** Opens with the client-cached next-ID suggestion immediately, then silently upgrades it
   * once a fresh employee-credentials list comes back from the server — the client-side
   * `state.employeeCredentials` only ever refreshes on page load plus whatever's been
   * optimistically appended since, so a long-lived tab (or a credential created from another
   * tab/session) could otherwise suggest a stale/duplicate ID. Still fully editable either way. */
  function openAdd() {
    setForm(emptyForm(state));
    setError('');
    setAddOpen(true);
    (async () => {
      try {
        const res = await fetch('/api/admin/hr-tool/employee-credentials', { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
          const fresh = data.data as HrEmployeeCredential[];
          setForm((f) => ({ ...f, employeeCode: nextEmployeeCode(fresh) }));
        }
      } catch {
        // Keep the client-state-based suggestion already set above — still correct in the
        // common case, just not guaranteed-fresh.
      }
    })();
  }

  function previewOffer() {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("Please enter the employee's first and last name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!/^\+?[0-9 -]{7,15}$/.test(form.contact.trim())) { setError('Please enter a valid contact number.'); return; }
    if (!form.designation) { setError('Please choose a designation.'); return; }
    if (!form.team) { setError('Please choose a department.'); return; }
    if (!form.ctc.trim() || Number(form.ctc) <= 0) { setError('Please enter the Annual CTC.'); return; }
    if (!form.doj) { setError('Please enter their date of joining.'); return; }
    // Reporting Manager is deliberately the one optional field here — blank just falls back to
    // the Department's configured manager (see managerOf), so there's nothing to validate.
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
        name: fullNameOf(preview), employeeCode: preview.employeeCode.trim(), designation: preview.designation,
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
      const manager = managerOf(preview, state);
      const offerMerged = offerLetterFor(preview);
      const documents = state.orgStructure.requiredDocuments.map((name) => ({
        name, status: 'not_uploaded', url: null, uploadedAt: null, remarks: null,
      }));
      const newEmployee = {
        id: nextEmployeeId(state.employees), credentialId: credential.id, name: fullNameOf(preview),
        email: preview.email.trim() || '—', phone: preview.contact.trim() || null, designation: preview.designation, team: preview.team, manager,
        status: 'active', doj: preview.doj, sysRole: 'Employee', ctc,
        leaveBalance: { Casual: 6, Sick: 6, Earned: 10 }, documents,
        documentsDeadline: documents.length ? addDays(preview.doj, DOCUMENTS_WINDOW_DAYS) : null,
        kycDocuments: emptyKycDocuments(),
        signedDocs: [{ type: 'Offer Letter', content: offerMerged, signedDate: today }],
      };
      await persistEmployees([...state.employees, newEmployee]);

      const emailAddr = preview.email.trim();
      if (emailAddr) {
        try {
          const mailRes = await fetch('/api/admin/hr-tool/onboarding/send-offer-letter', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              to: emailAddr,
              employeeName: fullNameOf(preview),
              subject: `Your Offer of Employment — ${preview.designation}`,
              textBody: offerMerged,
            }),
          });
          const mailData = await mailRes.json();
          if (mailRes.ok && mailData.success) {
            logRuleChange(`Offer letter emailed to ${fullNameOf(preview)} (${emailAddr})`);
          }
        } catch {
          // Best-effort — the employee/offer letter are already saved either way; email dispatch
          // failing here shouldn't block the hire.
        }
      }

      setPreview(null);
    } catch {
      setError('An error occurred while creating this employee');
    } finally {
      setSending(false);
    }
  }

  /** Generates a properly formatted, paginated PDF of the same letter shown in the preview —
   * the structured version (letterhead, compensation table) for the default generated letter,
   * or a paginated plain-text version if HR has drafted a custom template. */
  async function downloadLetter() {
    if (!preview) return;
    setDownloading(true);
    setError('');
    try {
      const bytes = hasCustomTemplate() ? await generatePlainLetterPdf(offerLetterFor(preview)) : await generateJoiningLetterPdf(letterDataFor(preview));
      const safeName = fullNameOf(preview).trim().replace(/\s+/g, '-') || 'Employee';
      triggerPdfDownload(bytes, `Joining-Letter-${safeName}-${preview.employeeCode.trim()}.pdf`);
    } catch (err) {
      console.error('Joining letter PDF generation failed:', err);
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button className={className} onClick={openAdd}>{label}</button>

      {addOpen && (
        <ModalShell title="Send Joining Letter" onClose={() => setAddOpen(false)} maxWidth={640} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setAddOpen(false) },
          { label: 'Preview Joining Letter', cls: 'btn primary', onClick: previewOffer },
        ]}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div className="notice info" style={{ width: 220, marginBottom: 0 }}>
              <div style={{ marginBottom: -12 }}>
                <EmployeeIdField form={form} onChange={patch} isEdit={false} />
              </div>
            </div>
          </div>
          {error && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{error}</div>}

          <div className="field-grid-2">
            <div className="field"><label className="field-label">First name *</label><input type="text" placeholder="e.g. Kavita" value={form.firstName} onChange={(e) => patch({ firstName: e.target.value })} /></div>
            <div className="field"><label className="field-label">Last name *</label><input type="text" placeholder="e.g. Rao" value={form.lastName} onChange={(e) => patch({ lastName: e.target.value })} /></div>
          </div>

          <div className="field-grid-2">
            <div className="field"><label className="field-label">Email *</label><input type="email" placeholder="name@snf.co" value={form.email} onChange={(e) => patch({ email: e.target.value })} /></div>
            <div className="field"><label className="field-label">Contact *</label><input type="tel" placeholder="e.g. 9876543210" value={form.contact} onChange={(e) => patch({ contact: e.target.value })} /></div>
          </div>

          <div className="field-grid-3">
            <div className="field">
              <label className="field-label">Designation *</label>
              <DesignationSelect value={form.designation} onChange={(v) => patch({ designation: v })} />
            </div>
            <div className="field">
              <label className="field-label">Department *</label>
              <select value={form.team} onChange={(e) => patch({ team: e.target.value })}>{state.teams.map((t) => <option key={t.name}>{t.name}</option>)}</select>
            </div>
            <div className="field">
              <label className="field-label">Reporting Manager</label>
              <select value={form.reportingManager} onChange={(e) => patch({ reportingManager: e.target.value })}>
                <option value="">
                  {state.teams.find((t) => t.name === form.team)?.manager ? `— Use Department default (${state.teams.find((t) => t.name === form.team)?.manager}) —` : '— None —'}
                </option>
                {state.employees.filter((e) => e.status !== 'exited').map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div className="field-grid-2">
            <div className="field"><label className="field-label">Annual CTC (₹) *</label><input type="number" placeholder="e.g. 480000" value={form.ctc} onChange={(e) => patch({ ctc: e.target.value })} /></div>
            <div className="field"><label className="field-label">Date of joining *</label><input type="date" value={form.doj} onChange={(e) => patch({ doj: e.target.value })} /></div>
          </div>

          <CredentialFields form={form} onChange={patch} isEdit={false} showAvatar={false} hideId sideBySidePasswords />
        </ModalShell>
      )}

      {preview && (
        <ModalShell title="Preview — Joining Letter" onClose={() => setPreview(null)} maxWidth={720} actions={[
          { label: 'Back to edit', cls: 'btn', onClick: () => { setAddOpen(true); setPreview(null); }, },
          { label: downloading ? 'Preparing PDF…' : 'Download Joining Letter', cls: 'btn', onClick: downloadLetter },
          { label: sending ? 'Creating…' : 'Approve & Send', cls: 'btn primary', onClick: approveAndSend },
        ]}>
          <div className="notice info">
            Approving creates their login{preview.email.trim() ? ' and emails them this letter.' : '.'}
          </div>
          {error && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{error}</div>}
          {hasCustomTemplate() ? (
            <div className="card pad" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
              {offerLetterFor(preview)}
            </div>
          ) : (
            <div className="card pad" style={{ padding: 28 }}>
              <JoiningLetterView d={letterDataFor(preview)} />
            </div>
          )}
          <div className="meta" style={{ marginTop: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span>Employee ID: <code>{preview.employeeCode}</code></span>
            <span>· Password: <code>{preview.password}</code></span>
            <button
              type="button"
              className="btn sm"
              onClick={() => copyToClipboard(preview.password).then((ok) => { if (!ok) alert(`Could not copy automatically — Password: ${preview.password}`); })}
            >
              Copy password
            </button>
            <span>· Date of joining: {preview.doj}</span>
          </div>
        </ModalShell>
      )}
    </>
  );
}
