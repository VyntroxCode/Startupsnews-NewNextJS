'use client';

import { useEffect, useRef, useState } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { KYC_SECTIONS, validateKycField, type HrKycDocuments, type HrKycSlotValue, type KycSlotDef } from '@/modules/hr-tool/domain/kyc';

const cardClass = 'mt-4 rounded-xl border border-solid border-black/5 bg-linear-to-br from-white to-slate-50 p-4 shadow-sm box-border sm:p-6 md:mt-6 md:p-8';
const inputClass = 'box-border min-h-11 w-full rounded-lg border border-solid border-slate-200 bg-white px-3 py-2 text-base sm:text-sm';
const labelClass = 'mb-1 block text-xs font-semibold text-slate-600';
/** A slot with 2–3 text fields sits side by side from `sm` up and stacks on phones. */
const FIELD_GRID = ['grid-cols-1', 'grid-cols-1', 'grid-cols-1 sm:grid-cols-2', 'grid-cols-1 sm:grid-cols-3'];

/** PUT via XHR (not fetch) so real upload-progress events are available — same pattern as
 * ImageUpload.tsx's uploadWithProgress, since fetch() has no byte-level progress API. */
function uploadWithProgress(uploadUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) onProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload to storage failed (${xhr.status}). ${xhr.responseText || 'Please try again.'}`));
    };
    xhr.onerror = () => reject(new Error('Upload to storage failed — network error. Please try again.'));
    xhr.send(file);
  });
}

const STATUS_STYLE: Record<string, { tone: string; label: string }> = {
  not_uploaded: { tone: 'bg-slate-100 text-slate-500', label: 'Not uploaded' },
  pending: { tone: 'bg-orange-100 text-orange-700', label: 'Pending review' },
  approved: { tone: 'bg-green-100 text-green-800', label: 'Approved' },
  rejected: { tone: 'bg-red-100 text-red-700', label: 'Rejected' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.not_uploaded;
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.tone}`}>
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
  onSave: (fields: Record<string, string> | undefined, file: File | null, onProgress: (pct: number) => void) => Promise<string | null>;
}) {
  const [fields, setFields] = useState<Record<string, string>>(value.fields || {});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
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
    setUploadPct(file ? 0 : null);
    try {
      const err = await onSave(slotDef.fields.length ? fields : undefined, file, setUploadPct);
      if (err) setError(err);
      else setFile(null);
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  }

  const saveDisabled = saving || !dirty || hasFieldError;

  return (
    <div className="mb-3 rounded-xl border border-solid border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.9rem] font-semibold text-slate-900">
            {slotDef.label} {slotDef.required && <span className="text-red-600">*</span>}
          </div>
          {value.status === 'rejected' && value.remarks && (
            <div className="mt-1 text-[0.8rem] text-red-700">Rejected: {value.remarks}</div>
          )}
          {value.uploadedAt && value.status !== 'not_uploaded' && (
            <div className="mt-1 text-xs text-slate-400">Uploaded {value.uploadedAt}</div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <StatusBadge status={value.status} />
          {value.url && <a href={value.url} target="_blank" rel="noopener noreferrer" className="text-[0.8rem] font-semibold text-indigo-500 no-underline">View</a>}
        </div>
      </div>

      {slotDef.fields.length > 0 && (
        <div className={`mt-3 grid gap-2.5 ${FIELD_GRID[Math.min(slotDef.fields.length, 3)]}`}>
          {slotDef.fields.map((f) => (
            <div key={f.key} className="min-w-0">
              <label className={labelClass}>{f.label}</label>
              <input type="text" className={inputClass} placeholder={f.placeholder} value={fields[f.key] || ''} onChange={(e) => updateField(f.key, e.target.value)} />
              {fieldErrors[f.key] && <div className="mt-1 text-xs text-red-600">{fieldErrors[f.key]}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center sm:gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="min-h-11 min-w-0 cursor-pointer truncate rounded-lg border border-solid border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 sm:max-w-[280px]">
          {file ? file.name : value.url ? 'Replace file' : 'Choose file'}
        </button>
        <button
          type="button"
          disabled={saveDisabled}
          onClick={save}
          className={`min-h-11 cursor-pointer whitespace-nowrap rounded-lg border-0 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed ${saveDisabled ? 'bg-slate-300' : 'bg-indigo-500'}`}
        >
          {saving ? (uploadPct !== null ? `Uploading… ${uploadPct}%` : 'Saving…') : 'Save'}
        </button>
      </div>
      {saving && uploadPct !== null && (
        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-indigo-500 transition-[width] duration-150" style={{ width: `${uploadPct}%` }} />
        </div>
      )}
      {error && <div className="mt-2 text-[0.8rem] text-red-700">{error}</div>}
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

  async function handleSave(slotKey: string, fields: Record<string, string> | undefined, file: File | null, onProgress: (pct: number) => void): Promise<string | null> {
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
        await uploadWithProgress(uploadUrl, file, onProgress);
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

  if (loading) return <div className={`${cardClass} text-slate-500`}>Loading KYC documents…</div>;
  if (!data?.linked || !data.documents) {
    return (
      <div className={cardClass}>
        <div className="text-slate-500">No Directory record is linked to your login yet — ask your Founder/HR to complete your hire record first.</div>
      </div>
    );
  }

  const documents = data.documents;
  const pct = data.progress?.pct ?? 0;

  return (
    <div className={cardClass}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-lg font-bold text-slate-900">KYC &amp; Personal Documents</h3>
        <span className={`text-sm font-semibold ${pct === 100 ? 'text-green-800' : 'text-slate-500'}`}>{pct}% complete</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full transition-[width] duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
      </div>

      {KYC_SECTIONS.map((section) => (
        <div key={section.title} className="mb-6">
          <div className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-wide text-slate-700">
            {section.title}
          </div>
          {section.slots.map((slot) => (
            <SlotCard key={slot.key} slotDef={slot} value={documents[slot.key]} onSave={(fields, file, onProgress) => handleSave(slot.key, fields, file, onProgress)} />
          ))}
        </div>
      ))}
    </div>
  );
}
