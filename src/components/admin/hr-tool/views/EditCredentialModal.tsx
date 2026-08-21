'use client';

import { useEffect, useState } from 'react';
import ModalShell from '../ModalShell';
import { getAuthHeaders } from '@/lib/admin-auth';
import { CredentialFields, nextEmployeeCode, validateCredentialFields, type CredentialFormState } from './CredentialFields';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

interface SeedEmployee { name: string; designation: string; email: string; }

/** Two jobs in one modal, since they share every field: editing an already-hired employee's
 * login (password reset, photo, panel-role re-link — pass `credential`), or issuing a login
 * for an employee who was never given one (e.g. an old CSV-imported record — pass `seed`
 * instead, pre-filling name/designation/email so they aren't re-typed). Name/designation/
 * email aren't editable here once a credential exists — those live on the Directory record,
 * set once at hire; editing them here would desync the two records. Opened from Directory's
 * employee profile, Founder-only. */
export default function EditCredentialModal({ credential, seed, existingCredentials, onClose, onSaved }: {
  credential?: HrEmployeeCredential;
  seed?: SeedEmployee;
  existingCredentials: HrEmployeeCredential[];
  onClose: () => void;
  onSaved: (updated: HrEmployeeCredential) => void;
}) {
  const isEdit = !!credential;
  const [form, setForm] = useState<CredentialFormState>({
    employeeCode: credential?.employeeCode || nextEmployeeCode(existingCredentials),
    avatarUrl: credential?.avatarUrl || '',
    password: '', confirmPassword: '', panelRole: credential?.panelRole || '',
    linkedPanelAdminId: credential?.linkedPanelAdmin?.id || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Same staleness concern as HireEmployeeButton's openAdd(): existingCredentials is whatever
  // Directory's client state happened to hold when this modal opened, which could lag the DB
  // (long-lived tab, credential created from another tab/session). Silently upgrade the
  // suggested ID once a fresh list comes back — only matters when issuing a new credential.
  useEffect(() => {
    if (isEdit) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/hr-tool/employee-credentials', { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
          const fresh = data.data as HrEmployeeCredential[];
          setForm((f) => ({ ...f, employeeCode: nextEmployeeCode(fresh) }));
        }
      } catch {
        // Keep the client-state-based suggestion already set above.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(p: Partial<CredentialFormState>) { setForm((f) => ({ ...f, ...p })); }

  async function save() {
    const credError = validateCredentialFields(form, isEdit);
    if (credError) { setError(credError); return; }

    setSaving(true);
    setError('');
    try {
      const url = isEdit ? `/api/admin/hr-tool/employee-credentials/${credential!.id}` : '/api/admin/hr-tool/employee-credentials';
      const body: Record<string, unknown> = isEdit
        ? { avatarUrl: form.avatarUrl || null, panelRole: form.panelRole || null, linkedPanelAdminId: form.linkedPanelAdminId || null }
        : {
            name: seed!.name, employeeCode: form.employeeCode.trim(), designation: seed!.designation,
            email: seed!.email !== '—' ? seed!.email || null : null, avatarUrl: form.avatarUrl || null,
            panelRole: form.panelRole || null, linkedPanelAdminId: form.linkedPanelAdminId || null,
          };
      if (form.password) body.password = form.password;

      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Failed to save'); return; }
      onSaved(data.data as HrEmployeeCredential);
      onClose();
    } catch {
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={isEdit ? `Login & credentials — ${credential!.name}` : `Issue Employee ID — ${seed!.name}`}
      onClose={saving ? () => {} : onClose}
      maxWidth={640}
      actions={[
        { label: 'Cancel', cls: 'btn', onClick: onClose },
        { label: saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Issue Employee ID'), cls: 'btn primary', onClick: save },
      ]}
    >
      {error && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{error}</div>}
      <CredentialFields form={form} onChange={patch} isEdit={isEdit} excludeCredentialId={credential?.id} />
    </ModalShell>
  );
}
