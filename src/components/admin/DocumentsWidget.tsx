'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';

interface DocRow { name: string; status: string; url?: string | null; uploadedAt?: string | null; remarks?: string | null; }
interface DocumentsMeData {
  linked: boolean;
  employeeCode?: string;
  name?: string;
  requiredDocuments?: string[];
  documents?: DocRow[];
  progressPct?: number;
  documentsDeadline?: string | null;
  daysLeft?: number | null;
}

const cardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  marginTop: '1.5rem',
};
const thStyle: CSSProperties = {
  textAlign: 'left', padding: '0.6rem 0.9rem', fontSize: '0.75rem', textTransform: 'uppercase',
  letterSpacing: '0.04em', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0',
};
const tdStyle: CSSProperties = { padding: '0.75rem 0.9rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a', verticalAlign: 'top' };

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  not_uploaded: { bg: '#f1f5f9', text: '#64748b', label: 'Not uploaded' },
  pending: { bg: '#ffedd5', text: '#c2410c', label: 'Pending review' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' },
};

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

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.not_uploaded;
  return (
    <span style={{ background: s.bg, color: s.text, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

interface DocumentsWidgetProps {
  /** Base path for GET .../me and POST (record upload). Defaults to the Publisher/Event Admin surface. */
  apiBase?: string;
  getHeaders?: () => HeadersInit;
  /** Where to request a presigned S3 URL. Publisher/Event Admin reuse the shared admin presign
   * route (they already carry the main admin JWT); plain employees pass the isolated employee-JWT route. */
  presignEndpoint?: string;
}

/** Shared "required onboarding documents" checklist UI — upload/replace, status, and a
 * completion strip. Used as-is on both the plain-employee and Publisher/Event Admin surfaces
 * (see employee/documents/page.tsx and (admin)/admin/documents/page.tsx), same
 * apiBase/getHeaders prop-injection pattern as AttendanceWidget. */
export default function DocumentsWidget({
  apiBase = '/api/admin/documents',
  getHeaders = getAuthHeaders,
  presignEndpoint = '/api/admin/presign',
}: DocumentsWidgetProps) {
  const [data, setData] = useState<DocumentsMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [error, setError] = useState('');
  // Window state lives beside the checklist: `closed` is derivable from daysLeft, but whether a
  // permission request is already in flight is only known server-side, and without it the UI
  // would keep offering a second request that the API would reject.
  const [pendingRequest, setPendingRequest] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqReason, setReqReason] = useState('');
  const [reqBusy, setReqBusy] = useState(false);
  const [reqNote, setReqNote] = useState('');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/me`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }

  async function loadWindow() {
    try {
      const res = await fetch(`${apiBase}/window`, { headers: getHeaders() });
      const json = await res.json();
      if (json?.success) setPendingRequest(!!json.data?.pendingRequest);
    } catch { /* non-fatal — the checklist itself still works */ }
  }

  async function submitAccessRequest() {
    const reason = reqReason.trim();
    if (!reason) { setReqNote('Please say why you need the window reopened.'); return; }
    setReqBusy(true);
    setReqNote('');
    try {
      const res = await fetch(`${apiBase}/window`, {
        method: 'POST', headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Could not send the request.');
      setPendingRequest(true);
      setReqOpen(false);
      setReqReason('');
      setReqNote('Request sent — HR will review it.');
    } catch (err) {
      setReqNote(err instanceof Error ? err.message : 'Could not send the request.');
    } finally {
      setReqBusy(false);
    }
  }

  useEffect(() => {
    load();
    loadWindow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function handleFileSelected(docName: string, file: File) {
    setUploadingName(docName);
    setUploadPct(0);
    setError('');
    try {
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const presignRes = await fetch(presignEndpoint, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ filename: safeFilename, contentType: file.type || 'application/octet-stream' }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok || !presignJson.success) throw new Error(presignJson.error || 'Failed to prepare upload.');
      const { uploadUrl, fileUrl } = presignJson.data as { uploadUrl: string; fileUrl: string };

      await uploadWithProgress(uploadUrl, file, setUploadPct);

      const recordRes = await fetch(apiBase, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: docName, url: fileUrl }),
      });
      const recordJson = await recordRes.json();
      if (!recordRes.ok || !recordJson.success) throw new Error(recordJson.error || 'Failed to record upload.');

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingName(null);
      setUploadPct(null);
    }
  }

  if (loading) return <div style={cardStyle}>Loading documents…</div>;
  if (!data?.linked) {
    return (
      <div style={cardStyle}>
        <div style={{ color: '#64748b' }}>No Directory record is linked to your login yet — ask your Founder/HR to complete your hire record first.</div>
      </div>
    );
  }

  const documents = data.documents || [];
  // `data.progressPct` from the API is the combined generic+KYC figure (see /api/employee/documents/me)
  // meant for the page-level ProfileProgressStrip, not this section specifically — trusting it here
  // showed a confusing non-zero "% complete" above an empty "no checklist set up" list once the
  // generic Required Documents list was emptied out. This widget only ever shows/tracks the generic
  // checklist, so it computes its own percentage from just that.
  const requiredCount = data.requiredDocuments?.length || 0;
  const pct = requiredCount ? Math.round((documents.filter((d) => d.status === 'pending' || d.status === 'approved').length / requiredCount) * 100) : null;
  const dl = data.daysLeft ?? null;
  const overdue = pct !== null && dl !== null && dl < 0 && pct < 100;
  // Uploading is now genuinely blocked past the deadline (HrToolService.recordDocumentUpload),
  // so the UI has to say so rather than offering an Upload button that will 409.
  const windowClosed = !!data.documentsDeadline && dl !== null && dl < 0;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Required documents</h3>
        {pct !== null && (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: pct === 100 ? '#166534' : '#64748b' }}>{pct}% complete</span>
        )}
      </div>
      {windowClosed && (
        <div style={{ margin: '0.75rem 0', padding: '0.85rem 1rem', borderRadius: 10, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.875rem' }}>
          <strong>Your upload window closed on {data.documentsDeadline}.</strong>{' '}
          Uploading is disabled until HR reopens it.
          {pendingRequest ? (
            <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>Your request is with HR — you&apos;ll be able to upload as soon as it&apos;s approved.</div>
          ) : reqOpen ? (
            <div style={{ marginTop: '0.6rem' }}>
              <textarea
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Why do you need the window reopened?"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.65rem', borderRadius: 8, border: '1px solid #fcd34d', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
                <button type="button" onClick={submitAccessRequest} disabled={reqBusy}
                  style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none', background: '#b45309', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: reqBusy ? 'not-allowed' : 'pointer' }}>
                  {reqBusy ? 'Sending…' : 'Send request'}
                </button>
                <button type="button" onClick={() => { setReqOpen(false); setReqNote(''); }} disabled={reqBusy}
                  style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #fcd34d', background: '#fff', color: '#92400e', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '0.6rem' }}>
              <button type="button" onClick={() => { setReqOpen(true); setReqNote(''); }}
                style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none', background: '#b45309', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                Request permission to upload
              </button>
            </div>
          )}
          {reqNote && <div style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>{reqNote}</div>}
        </div>
      )}
      {pct !== null && (
        <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#6366f1', transition: 'width 0.3s' }} />
        </div>
      )}

      {pct !== null && pct < 100 && dl !== null && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
          background: overdue ? '#fef2f2' : dl <= 1 ? '#fff7ed' : '#eef2ff',
          color: overdue ? '#b91c1c' : dl <= 1 ? '#c2410c' : '#3730a3',
        }}>
          {overdue ? 'Your document submission window has closed — please upload the remaining documents as soon as possible.'
            : `${dl} day${dl === 1 ? '' : 's'} left to submit your required documents.`}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem', background: '#fef2f2', color: '#991b1b', fontSize: '0.875rem', borderRadius: 8, border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div style={{ color: '#64748b' }}>No document checklist has been set up yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={thStyle}>Document</th><th style={thStyle}>Status</th><th style={{ ...thStyle, textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.name}>
                <td style={tdStyle}>
                  {d.name}
                  {d.status === 'rejected' && d.remarks && (
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#b91c1c' }}>Rejected: {d.remarks}</div>
                  )}
                  {d.uploadedAt && d.status !== 'not_uploaded' && (
                    <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>Uploaded {d.uploadedAt}</div>
                  )}
                </td>
                <td style={tdStyle}><StatusBadge status={d.status} /></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View</a>
                    )}
                    <input
                      ref={(el) => { fileInputs.current[d.name] = el; }}
                      type="file"
                      accept="application/pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(d.name, file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingName === d.name}
                      onClick={() => fileInputs.current[d.name]?.click()}
                      style={{
                        padding: '0.4rem 0.9rem', background: uploadingName === d.name ? '#a0aec0' : '#6366f1', color: '#fff',
                        border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: uploadingName === d.name ? 'not-allowed' : 'pointer',
                        minWidth: uploadingName === d.name ? 108 : undefined,
                      }}
                    >
                      {uploadingName === d.name ? `Uploading… ${uploadPct ?? 0}%` : d.status === 'not_uploaded' ? 'Upload' : d.status === 'rejected' ? 'Re-upload' : 'Replace'}
                    </button>
                  </div>
                  {uploadingName === d.name && (
                    <div style={{ height: 5, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ height: '100%', width: `${uploadPct ?? 0}%`, background: '#6366f1', transition: 'width 0.15s' }} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
