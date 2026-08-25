'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { KYC_SECTIONS, validateKycField, type HrKycDocuments, type HrKycSlotValue, type KycSlotDef } from '@/modules/hr-tool/domain/kyc';

const cardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  marginTop: '1.5rem',
};
const slotCardStyle: CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.1rem', marginBottom: '0.75rem', background: '#fff',
};
const inputStyle: CSSProperties = {
  width: '100%', padding: '0.5rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box',
};
const labelStyle: CSSProperties = { display: 'block', marginBottom: 4, fontSize: '0.78rem', fontWeight: 600, color: '#475569' };

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  not_uploaded: { bg: '#f1f5f9', text: '#64748b', label: 'Not uploaded' },
  pending: { bg: '#ffedd5', text: '#c2410c', label: 'Pending review' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.not_uploaded;
  return (
    <span style={{ background: s.bg, color: s.text, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

interface KycMeData {
  linked: boolean;
  documents?: HrKycDocuments;
  progress?: { total: number; submitted: number; pct: number };
}

interface KycDocumentsWidgetProps {
  apiBase?: string;
  getHeaders?: () => HeadersInit;
  presignEndpoint?: string;
}

/** One checklist item's card — a status/remarks/upload row, plus (for slots that have them,
 * e.g. PAN's number, an education entry's qualification/institution/year) a small text-field
 * form saved together with the file in one "Save" action. */
function SlotCard({ slotDef, value, onSave }: {
  slotDef: KycSlotDef;
  value: HrKycSlotValue;
  onSave: (fields: Record<string, string> | undefined, file: File | null) => Promise<string | null>;
}) {
  const [fields, setFields] = useState<Record<string, string>>(value.fields || {});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFields(value.fields || {});
    setFile(null);
  }, [value]);

  function updateField(key: string, raw: string) {
    setFields((f) => ({ ...f, [key]: raw }));
    const fieldDef = slotDef.fields.find((f) => f.key === key);
    if (fieldDef) {
      const { error } = validateKycField(fieldDef, raw);
      setFieldErrors((e) => ({ ...e, [key]: error }));
    }
  }

  const dirty = file !== null || slotDef.fields.some((f) => (fields[f.key] || '') !== (value.fields[f.key] || ''));
  const hasFieldError = Object.values(fieldErrors).some(Boolean);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const err = await onSave(slotDef.fields.length ? fields : undefined, file);
      if (err) setError(err);
      else setFile(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={slotCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: fields ? 10 : 0 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
            {slotDef.label} {slotDef.required && <span style={{ color: '#dc2626' }}>*</span>}
          </div>
          {value.status === 'rejected' && value.remarks && (
            <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#b91c1c' }}>Rejected: {value.remarks}</div>
          )}
          {value.uploadedAt && value.status !== 'not_uploaded' && (
            <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>Uploaded {value.uploadedAt}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {value.url && <a href={value.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View</a>}
          <StatusBadge status={value.status} />
        </div>
      </div>

      {slotDef.fields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(slotDef.fields.length, 3)}, 1fr)`, gap: '0.6rem', marginBottom: '0.6rem' }}>
          {slotDef.fields.map((f) => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input type="text" style={inputStyle} placeholder={f.placeholder} value={fields[f.key] || ''} onChange={(e) => updateField(f.key, e.target.value)} />
              {fieldErrors[f.key] && <div style={{ marginTop: 3, fontSize: '0.75rem', color: '#dc2626' }}>{fieldErrors[f.key]}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
          {file ? file.name : value.url ? 'Replace file' : 'Choose file'}
        </button>
        <button
          type="button"
          disabled={saving || !dirty || hasFieldError}
          onClick={save}
          style={{
            padding: '0.4rem 0.9rem', background: saving || !dirty || hasFieldError ? '#cbd5e1' : '#6366f1', color: '#fff',
            border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: saving || !dirty || hasFieldError ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#b91c1c' }}>{error}</div>}
    </div>
  );
}

/** "KYC & Personal Documents" — PAN, Aadhaar, bank statements, cheque, salary slip, education
 * (up to 4 entries), and past-experience letters (up to 3 entries). A fixed HR-policy checklist,
 * separate from the admin-configurable generic Required Documents list shown by DocumentsWidget
 * above it on the same page — see domain/kyc.ts for exactly what's required vs optional. */
export default function KycDocumentsWidget({
  apiBase = '/api/employee/kyc',
  getHeaders = getAuthHeaders,
  presignEndpoint = '/api/employee/documents/presign',
}: KycDocumentsWidgetProps) {
  const [data, setData] = useState<KycMeData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/me`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function handleSave(slotKey: string, fields: Record<string, string> | undefined, file: File | null): Promise<string | null> {
    try {
      let url: string | undefined;
      if (file) {
        const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const presignRes = await fetch(presignEndpoint, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify({ filename: safeFilename, contentType: file.type || 'application/octet-stream' }),
        });
        const presignJson = await presignRes.json();
        if (!presignRes.ok || !presignJson.success) return presignJson.error || 'Failed to prepare upload.';
        const { uploadUrl, fileUrl } = presignJson.data as { uploadUrl: string; fileUrl: string };
        const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
        if (!putRes.ok) return `Upload to storage failed (${putRes.status}).`;
        url = fileUrl;
      }

      const res = await fetch(apiBase, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ slotKey, fields, url }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) return json.error || 'Failed to save.';
      await load();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to save.';
    }
  }

  if (loading) return <div style={cardStyle}>Loading KYC documents…</div>;
  if (!data?.linked || !data.documents) {
    return (
      <div style={cardStyle}>
        <div style={{ color: '#64748b' }}>No Directory record is linked to your login yet — ask your Founder/HR to complete your hire record first.</div>
      </div>
    );
  }

  const documents = data.documents;
  const pct = data.progress?.pct ?? 0;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>KYC &amp; Personal Documents</h3>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: pct === 100 ? '#166534' : '#64748b' }}>{pct}% complete</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#6366f1', transition: 'width 0.3s' }} />
      </div>

      {KYC_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>
            {section.title}
          </div>
          {section.slots.map((slot) => (
            <SlotCard key={slot.key} slotDef={slot} value={documents[slot.key]} onSave={(fields, file) => handleSave(slot.key, fields, file)} />
          ))}
        </div>
      ))}
    </div>
  );
}
