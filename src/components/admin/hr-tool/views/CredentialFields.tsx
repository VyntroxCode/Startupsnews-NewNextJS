'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ImageUpload from '@/components/admin/ImageUpload';
import { getAuthHeaders } from '@/lib/admin-auth';
import type { HrEmployeeCredential, LinkedPanelAdminSummary } from '@/modules/hr-credentials/domain/types';
import type { PanelAdminRole } from '@/modules/panel-admins/domain/types';

export const PANEL_ROLE_LABEL: Record<PanelAdminRole, string> = { event_admin: 'Event Admin', publisher_admin: 'Publisher Admin' };

export const EMPLOYEE_CODE_PREFIX = 'SNFYI-';

/** Suggests the next Employee ID as SNFYI-<last number + 1> (starting at 101), editable by the admin.
 * Looks at the trailing number of every existing code (not just SNFYI-prefixed ones) so it keeps
 * counting up from IDs assigned before this prefix convention (e.g. "A-405" -> next is SNFYI-406). */
export function nextEmployeeCode(credentials: HrEmployeeCredential[]): string {
  const nums = credentials
    .map((c) => c.employeeCode.match(/(\d+)$/)?.[1])
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n, 10));
  const max = nums.length ? Math.max(...nums, 100) : 100;
  return `${EMPLOYEE_CODE_PREFIX}${max + 1}`;
}

export function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const randomValues = new Uint32Array(14);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(randomValues);
  else for (let i = 0; i < randomValues.length; i++) randomValues[i] = Math.floor(Math.random() * 4294967296);
  let out = '';
  for (let i = 0; i < randomValues.length; i++) out += chars[randomValues[i] % chars.length];
  return out;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The credential-specific half of the hire/edit form — Employee ID, avatar, password,
 * panel-role linking. Shared by HireEmployeeButton (create) and EditCredentialModal (edit)
 * so this markup/validation/fetch logic lives in exactly one place. Name/designation/email
 * are NOT part of this component — those are shared with the offer letter and owned by
 * the parent form, per the "don't ask the same field twice" merge. */
export interface CredentialFormState {
  employeeCode: string;
  avatarUrl: string;
  password: string;
  confirmPassword: string;
  panelRole: '' | PanelAdminRole;
  linkedPanelAdminId: number | '';
}

/** The Employee ID field alone — a prefixed ("SNFYI-") numeric input when creating, read-only
 * once created. Exported standalone so a caller can place it somewhere other than
 * CredentialFields' own default position (e.g. HireEmployeeButton puts it in a top banner) —
 * pass `hideId` to CredentialFields in that case so it isn't rendered twice. */
export function EmployeeIdField({ form, onChange, isEdit }: {
  form: Pick<CredentialFormState, 'employeeCode'>;
  onChange: (patch: Partial<CredentialFormState>) => void;
  isEdit: boolean;
}) {
  return (
    <div className="field">
      <label className="field-label">Employee ID</label>
      {isEdit ? (
        <input type="text" value={form.employeeCode} disabled />
      ) : (
        <div style={{ display: 'flex' }}>
          <span style={{
            display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, fontWeight: 600,
            color: 'var(--muted)', background: '#F1F5F9', border: '1px solid var(--line)', borderRight: 'none',
            borderRadius: '7px 0 0 7px', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{EMPLOYEE_CODE_PREFIX}</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.employeeCode.startsWith(EMPLOYEE_CODE_PREFIX) ? form.employeeCode.slice(EMPLOYEE_CODE_PREFIX.length) : form.employeeCode}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              onChange({ employeeCode: EMPLOYEE_CODE_PREFIX + digits });
            }}
            placeholder="101"
            style={{ borderRadius: '0 7px 7px 0', borderLeft: 'none' }}
          />
        </div>
      )}
      {isEdit && <div className="meta">Can&apos;t be changed after creation.</div>}
    </div>
  );
}

export function CredentialFields({
  form, onChange, isEdit, excludeCredentialId, showAvatar = true, hideId = false, idRowExtra, sideBySidePasswords = false,
}: {
  form: CredentialFormState;
  onChange: (patch: Partial<CredentialFormState>) => void;
  isEdit: boolean;
  excludeCredentialId?: number;
  /** Hide the photo upload — used by the Add Employee hire form, which doesn't collect one. */
  showAvatar?: boolean;
  /** Skip rendering the Employee ID field here — used when the caller places EmployeeIdField
   * itself somewhere else in the layout (e.g. a top banner), so it isn't shown twice. */
  hideId?: boolean;
  /** An extra field to place alongside Employee ID in the same row (e.g. Date of joining).
   * Ignored when hideId is true — there's no Employee ID row here to attach it to. */
  idRowExtra?: ReactNode;
  /** Password + Confirm password side by side in one row instead of stacked. */
  sideBySidePasswords?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState<LinkedPanelAdminSummary[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Stale availableAdmins left over from a previous role selection is harmless if `role` is
  // '' here — the section that renders it is itself gated on `form.panelRole` being truthy.
  async function loadAvailableAdmins(signal: { cancelled: boolean }) {
    const role = form.panelRole;
    if (!role) return;
    setLoadingAdmins(true);
    const params = new URLSearchParams({ role });
    if (excludeCredentialId) params.set('excludeCredentialId', String(excludeCredentialId));
    const res = await fetch(`/api/admin/hr-tool/employee-credentials/available-panel-admins?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (signal.cancelled) return;
    if (data.success) setAvailableAdmins(data.data);
    setLoadingAdmins(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    loadAvailableAdmins(signal);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.panelRole, excludeCredentialId]);

  function fillGeneratedPassword() {
    const pwd = generatePassword();
    onChange({ password: pwd, confirmPassword: pwd });
    setShowPassword(true);
  }

  async function handleCopy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    if (!ok) alert(`Could not copy automatically — ${label}: ${text}`);
  }

  const idField = <EmployeeIdField form={form} onChange={onChange} isEdit={isEdit} />;

  const passwordField = (
    <div className="field">
      <label className="field-label">{isEdit ? 'New password (leave blank to keep current)' : 'Password'}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input type={showPassword ? 'text' : 'password'} value={form.password}
          style={{ flex: '1 1 160px', minWidth: 0 }}
          onChange={(e) => onChange({ password: e.target.value })}
          placeholder={isEdit ? '••••••••' : 'At least 8 characters'} />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn sm" onClick={() => setShowPassword((s) => !s)}>{showPassword ? 'Hide' : 'Show'}</button>
          <button type="button" className="btn sm" onClick={fillGeneratedPassword}>Generate</button>
          {form.password && <button type="button" className="btn sm" onClick={() => handleCopy(form.password, 'Password')}>Copy</button>}
        </div>
      </div>
      <div className="meta" style={{ marginTop: 6 }}>
        This person signs in with this Employee ID and password from the admin login page&apos;s &quot;Employee ID&quot; tab.
      </div>
    </div>
  );

  const confirmPasswordField = (
    <div className="field">
      <label className="field-label">Confirm password</label>
      <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword}
        onChange={(e) => onChange({ confirmPassword: e.target.value })} placeholder="Re-enter password" />
    </div>
  );
  const showConfirm = form.password || !isEdit;

  return (
    <>
      {showAvatar && (
        <div className="field" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="avatar-upload-circle">
            <ImageUpload value={form.avatarUrl} onChange={(url) => onChange({ avatarUrl: url })} label="Photo (optional)" />
          </div>
        </div>
      )}

      {!hideId && (idRowExtra ? (
        <div className="field-grid-2">
          {idField}
          {idRowExtra}
        </div>
      ) : idField)}

      {sideBySidePasswords ? (
        <div className="field-grid-2">
          {passwordField}
          {showConfirm && confirmPasswordField}
        </div>
      ) : (
        <>
          {passwordField}
          {showConfirm && confirmPasswordField}
        </>
      )}

      <div className="field-grid-2">
        <div className="field">
          <label className="field-label">Role (admin panel access)</label>
          <select value={form.panelRole} onChange={(e) => onChange({ panelRole: e.target.value as '' | PanelAdminRole, linkedPanelAdminId: '' })}>
            <option value="">None — HR record only</option>
            <option value="publisher_admin">Publisher Admin</option>
            <option value="event_admin">Event Admin</option>
          </select>
        </div>

        {form.panelRole && (
          <div className="field">
            <label className="field-label">Link to existing {PANEL_ROLE_LABEL[form.panelRole]} account</label>
            <select value={form.linkedPanelAdminId} onChange={(e) => onChange({ linkedPanelAdminId: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">— Select —</option>
              {availableAdmins.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}
            </select>
          </div>
        )}
      </div>

      {form.panelRole && (
        <>
          {loadingAdmins && <div className="meta">Loading accounts…</div>}
          {!loadingAdmins && availableAdmins.length === 0 && (
            <div className="notice">No available {PANEL_ROLE_LABEL[form.panelRole]} accounts — create one first under Admins → Panel Admins.</div>
          )}
          <div className="meta">Once linked, this person signs in with this Employee ID and password instead of their original email and password.</div>
        </>
      )}
    </>
  );
}

/** Shared validation for the credential half of the form — used identically by
 * HireEmployeeButton (create) and EditCredentialModal (edit). Returns an error message, or
 * null if valid. */
export function validateCredentialFields(form: CredentialFormState, isEdit: boolean): string | null {
  const employeeCode = form.employeeCode.trim();
  if (!employeeCode || employeeCode === EMPLOYEE_CODE_PREFIX) return 'Employee ID number is required';
  if (!/^[A-Za-z0-9-]{3,32}$/.test(employeeCode)) return 'Employee ID must be 3-32 characters: letters, numbers, and hyphens only';
  if (!isEdit && !form.password) return 'Password is required';
  if (form.password && form.password.length < 8) return 'Password must be at least 8 characters';
  if (form.password && form.password !== form.confirmPassword) return 'Passwords do not match';
  if (form.panelRole && !form.linkedPanelAdminId) return 'Select an existing account to link for this role';
  return null;
}
