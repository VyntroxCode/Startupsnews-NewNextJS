'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ImageUpload from '@/components/admin/ImageUpload';
import { getAuthHeaders } from '@/lib/admin-auth';
import { initials } from '../utils';
import type { HrEmployeeCredential, HrCredentialDesignation, LinkedPanelAdminSummary } from '@/modules/hr-credentials/domain/types';
import type { PanelAdminRole } from '@/modules/panel-admins/domain/types';

const PANEL_ROLE_LABEL: Record<PanelAdminRole, string> = { event_admin: 'Event Admin', publisher_admin: 'Publisher Admin' };

const EMPLOYEE_CODE_PREFIX = 'SNFYI-';

/** Suggests the next Employee ID as SNFYI-<last number + 1> (starting at 101), editable by the admin.
 * Looks at the trailing number of every existing code (not just SNFYI-prefixed ones) so it keeps
 * counting up from IDs assigned before this prefix convention (e.g. "A-405" -> next is SNFYI-406). */
function nextEmployeeCode(credentials: HrEmployeeCredential[]): string {
  const nums = credentials
    .map((c) => c.employeeCode.match(/(\d+)$/)?.[1])
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n, 10));
  const max = nums.length ? Math.max(...nums, 100) : 100;
  return `${EMPLOYEE_CODE_PREFIX}${max + 1}`;
}

interface FormState {
  id: number | null;
  name: string;
  employeeCode: string;
  designation: HrCredentialDesignation;
  email: string;
  avatarUrl: string;
  password: string;
  confirmPassword: string;
  panelRole: '' | PanelAdminRole;
  linkedPanelAdminId: number | '';
}

const EMPTY_FORM: FormState = {
  id: null, name: '', employeeCode: '', designation: '', email: '', avatarUrl: '',
  password: '', confirmPassword: '', panelRole: '', linkedPanelAdminId: '',
};

function PageHead({ title, sub }: { title: string; sub: string }) {
  const { state } = useHrTool();
  return (
    <div className="topbar">
      <div><h1 className="page-title">{title}</h1><div className="page-sub">{sub}</div></div>
      <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
    </div>
  );
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const randomValues = new Uint32Array(14);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(randomValues);
  else for (let i = 0; i < randomValues.length; i++) randomValues[i] = Math.floor(Math.random() * 4294967296);
  let out = '';
  for (let i = 0; i < randomValues.length; i++) out += chars[randomValues[i] % chars.length];
  return out;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AssigningIds() {
  const { state } = useHrTool();
  const designations = state.orgStructure.designations;
  const [credentials, setCredentials] = useState<HrEmployeeCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [availableAdmins, setAvailableAdmins] = useState<LinkedPanelAdminSummary[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/hr-tool/employee-credentials', { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load employee IDs');
      setCredentials(data.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load employee IDs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  useEffect(() => {
    if (!form.panelRole) { setAvailableAdmins([]); return; }
    setLoadingAdmins(true);
    const params = new URLSearchParams({ role: form.panelRole });
    if (form.id) params.set('excludeCredentialId', String(form.id));
    fetch(`/api/admin/hr-tool/employee-credentials/available-panel-admins?${params}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => { if (data.success) setAvailableAdmins(data.data); })
      .finally(() => setLoadingAdmins(false));
  }, [form.panelRole, form.id]);

  const rows = useMemo(() => credentials.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.employeeCode.toLowerCase().includes(search.toLowerCase())
  ), [credentials, search]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, employeeCode: nextEmployeeCode(credentials) });
    setFormError('');
    setShowPassword(false);
    setModalOpen(true);
  }

  function openEdit(c: HrEmployeeCredential) {
    setForm({
      id: c.id, name: c.name, employeeCode: c.employeeCode, designation: c.designation,
      email: c.email || '', avatarUrl: c.avatarUrl || '', password: '', confirmPassword: '',
      panelRole: c.panelRole || '', linkedPanelAdminId: c.linkedPanelAdmin?.id || '',
    });
    setFormError('');
    setShowPassword(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function fillGeneratedPassword() {
    const pwd = generatePassword();
    setForm((f) => ({ ...f, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
  }

  async function handleCopy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    if (!ok) alert(`Could not copy automatically — ${label}: ${text}`);
  }

  async function save() {
    setFormError('');
    const name = form.name.trim();
    const employeeCode = form.employeeCode.trim();
    const isEdit = form.id !== null;

    if (!name) { setFormError('Employee name is required'); return; }
    if (!form.designation.trim()) { setFormError('Designation is required'); return; }
    if (!employeeCode || employeeCode === EMPLOYEE_CODE_PREFIX) { setFormError('Employee ID number is required'); return; }
    if (!/^[A-Za-z0-9-]{3,32}$/.test(employeeCode)) { setFormError('Employee ID must be 3-32 characters: letters, numbers, and hyphens only'); return; }
    if (!isEdit && !form.password) { setFormError('Password is required'); return; }
    if (form.password && form.password.length < 8) { setFormError('Password must be at least 8 characters'); return; }
    if (form.password && form.password !== form.confirmPassword) { setFormError('Passwords do not match'); return; }
    if (form.panelRole && !form.linkedPanelAdminId) { setFormError('Select an existing account to link for this role'); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name, employeeCode, designation: form.designation,
        email: form.email.trim() || null, avatarUrl: form.avatarUrl || null,
        panelRole: form.panelRole || null, linkedPanelAdminId: form.linkedPanelAdminId || null,
      };
      if (form.password) body.password = form.password;

      const url = isEdit ? `/api/admin/hr-tool/employee-credentials/${form.id}` : '/api/admin/hr-tool/employee-credentials';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.success) { setFormError(data.error || 'Failed to save'); return; }

      setModalOpen(false);
      await loadCredentials();
    } catch {
      setFormError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead title="Assigning IDs" sub="Issue an Employee ID and password, and optionally grant Publisher Admin / Event Admin access." />

      <div className="toolbar" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <input className="search" type="text" placeholder="Search by name or Employee ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={openCreate}>+ Create Employee ID</button>
      </div>

      {loadError && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{loadError}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 820 }}>
          <thead><tr><th>Name</th><th>Employee ID</th><th>Password</th><th>Designation</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="empty">Loading…</div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7}><div className="empty">No employee IDs assigned yet.</div></td></tr>
            ) : rows.map((c) => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                <td>
                  <div className="row-name">
                    <div className="avatar" style={c.avatarUrl ? { background: `url(${c.avatarUrl}) center/cover` } : undefined}>
                      {!c.avatarUrl && initials(c.name)}
                    </div>
                    <div><div>{c.name}</div><div className="meta">{c.email || '—'}</div></div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code>{c.employeeCode}</code>
                    <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); handleCopy(c.employeeCode, 'Employee ID'); }}>Copy</button>
                  </div>
                </td>
                <td>
                  {c.password ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code>{c.password}</code>
                      <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); handleCopy(c.password!, 'Password'); }}>Copy</button>
                    </div>
                  ) : <span className="meta">—</span>}
                </td>
                <td>{c.designation}</td>
                <td>{c.panelRole ? <span className="badge active">{PANEL_ROLE_LABEL[c.panelRole]}</span> : <span className="meta">—</span>}</td>
                <td><span className={`badge ${c.isActive ? 'active' : 'exited'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                <td style={{ textAlign: 'right', color: 'var(--muted)' }}>Edit ›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ModalShell
          title={form.id ? `Edit — ${form.name}` : 'Create Employee ID'}
          onClose={closeModal}
          maxWidth={640}
          actions={[
            { label: 'Cancel', cls: 'btn', onClick: closeModal },
            { label: saving ? 'Saving…' : (form.id ? 'Save changes' : 'Create Employee ID'), cls: 'btn primary', onClick: save },
          ]}
        >
          {formError && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{formError}</div>}

          <div className="field" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="avatar-upload-circle">
              <ImageUpload value={form.avatarUrl} onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))} label="Photo (optional)" />
            </div>
          </div>

          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Employee name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
            </div>

            <div className="field">
              <label className="field-label">Employee ID</label>
              {form.id !== null ? (
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
                      setForm((f) => ({ ...f, employeeCode: EMPLOYEE_CODE_PREFIX + digits }));
                    }}
                    placeholder="101"
                    style={{ borderRadius: '0 7px 7px 0', borderLeft: 'none' }}
                  />
                </div>
              )}
              {form.id !== null && <div className="meta">Can&apos;t be changed after creation.</div>}
            </div>
          </div>

          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Designation</label>
              <select value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value as HrCredentialDesignation }))}>
                <option value="">— Select —</option>
                {designations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {designations.length === 0 && (
                <div className="meta">No designations set up yet — add some under Rules &amp; Org Structure → Designations.</div>
              )}
            </div>

            <div className="field">
              <label className="field-label">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@snf.co" />
            </div>
          </div>

          <div className="field">
            <label className="field-label">{form.id ? 'New password (leave blank to keep current)' : 'Password'}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type={showPassword ? 'text' : 'password'} value={form.password}
                style={{ flex: '1 1 160px', minWidth: 0 }}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={form.id ? '••••••••' : 'At least 8 characters'} />
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

          {(form.password || !form.id) && (
            <div className="field">
              <label className="field-label">Confirm password</label>
              <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter password" />
            </div>
          )}

          <div className="field-grid-2">
            <div className="field">
              <label className="field-label">Role (admin panel access)</label>
              <select value={form.panelRole} onChange={(e) => setForm((f) => ({ ...f, panelRole: e.target.value as '' | PanelAdminRole, linkedPanelAdminId: '' }))}>
                <option value="">None — HR record only</option>
                <option value="publisher_admin">Publisher Admin</option>
                <option value="event_admin">Event Admin</option>
              </select>
            </div>

            {form.panelRole && (
              <div className="field">
                <label className="field-label">Link to existing {PANEL_ROLE_LABEL[form.panelRole]} account</label>
                <select value={form.linkedPanelAdminId} onChange={(e) => setForm((f) => ({ ...f, linkedPanelAdminId: e.target.value ? Number(e.target.value) : '' }))}>
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
        </ModalShell>
      )}
    </>
  );
}
