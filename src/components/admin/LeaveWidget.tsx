'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';

interface LeaveRequestRow {
  id: string; type: string; from: string; to: string; remarks: string;
  status: string; rmRemarks: string; hrRemarks: string;
}
interface LeaveMeData {
  linked?: boolean;
  leaveRequests?: LeaveRequestRow[];
  leaveTypes?: Record<string, { enabled: boolean; perMonth: number }>;
  leaveBalance?: Record<string, number>;
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
const labelStyle: CSSProperties = { display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.4rem', fontWeight: 600 };
// This project has no global `box-sizing: border-box` reset, so a plain `width: '100%'` plus
// padding renders WIDER than its container by the padding amount — that's what was making the
// From/To fields (each `flex: 1` in a row) visually overlap. Every form control below sets
// boxSizing explicitly so `width: 100%` means what it looks like it means.
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid #cbd5e1',
  padding: '0.6rem 0.75rem', fontSize: '0.875rem', color: '#0f172a', background: '#fff',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#ffedd5', text: '#c2410c', label: 'Pending approval' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: s.bg, color: s.text, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function localTodayStr(): string { return new Date().toISOString().slice(0, 10); }
function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface LeaveWidgetProps {
  /** Base path for GET (own requests + leave types) and POST (submit). Defaults to the
   * Publisher/Event Admin surface. */
  apiBase?: string;
  getHeaders?: () => HeadersInit;
}

/** Self-service "Apply for Leave" — own request history plus a form to submit a new one.
 * Future dates only (from tomorrow onward; same-day/past absences go through Regularization
 * instead). Lands in the same hr_leave_requests table the Founder's Leave Management page
 * already reads, so an approved request shows there for HR to act on and is automatically
 * picked up by payroll as a paid Leave day. Same apiBase/getHeaders prop-injection pattern as
 * AttendanceWidget/DocumentsWidget — used as-is on both the plain-employee and Publisher/Event
 * Admin surfaces. */
export default function LeaveWidget({ apiBase = '/api/admin/leave-requests', getHeaders = getAuthHeaders }: LeaveWidgetProps) {
  const [data, setData] = useState<LeaveMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [applyOpen, setApplyOpen] = useState(false);
  const [type, setType] = useState('');
  const [typeOther, setTypeOther] = useState('');
  const tomorrow = addDaysStr(localTodayStr(), 1);
  const [from, setFrom] = useState(tomorrow);
  const [to, setTo] = useState(tomorrow);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiBase, { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load leave requests');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const enabledTypes = Object.entries(data?.leaveTypes || {}).filter(([, cfg]) => cfg.enabled).map(([k]) => k);

  function openApply() {
    setType(enabledTypes[0] || '');
    setTypeOther('');
    setFrom(tomorrow);
    setTo(tomorrow);
    setReason('');
    setSubmitError('');
    setApplyOpen(true);
  }

  async function submit() {
    const finalType = type === '__other__' ? typeOther.trim() : type;
    if (!finalType) { setSubmitError('Please specify the leave type.'); return; }
    const trimmedReason = reason.trim();
    if (!trimmedReason) { setSubmitError('Please describe the reason.'); return; }
    if (to < from) { setSubmitError('The end date cannot be before the start date.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type: finalType, from, to, reason: trimmedReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to submit leave request');
      setApplyOpen(false);
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={cardStyle}>Loading leave requests…</div>;

  if (data?.linked === false) {
    return (
      <div style={cardStyle}>
        <div style={{ color: '#64748b' }}>No Employee ID has been assigned to your account yet. Ask your Founder to assign one under HR Management → Assigning IDs to apply for leave.</div>
      </div>
    );
  }

  const requests = data?.leaveRequests || [];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Leave</h3>
        <button
          type="button"
          onClick={openApply}
          style={{ padding: '0.5rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          + Apply for Leave
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem', background: '#fef2f2', color: '#991b1b', fontSize: '0.875rem', borderRadius: 8, border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {enabledTypes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.25rem' }}>
          {enabledTypes.map((t) => (
            <span
              key={t}
              style={{ background: '#eef2ff', color: '#4338ca', padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}
            >
              {t}: {data?.leaveBalance?.[t] ?? 0} left
            </span>
          ))}
        </div>
      )}

      {requests.length === 0 ? (
        <div style={{ color: '#64748b' }}>No leave requests yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={thStyle}>Type</th><th style={thStyle}>Dates</th><th style={thStyle}>Reason</th><th style={thStyle}>Status</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td style={tdStyle}>{r.type}</td>
                <td style={tdStyle}>{r.from}{r.to !== r.from ? ` – ${r.to}` : ''}</td>
                <td style={tdStyle}>
                  {r.remarks}
                  {r.status === 'rejected' && (r.rmRemarks || r.hrRemarks) && (
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#b91c1c' }}>Rejected: {r.hrRemarks || r.rmRemarks}</div>
                  )}
                  {r.status === 'approved' && (r.rmRemarks || r.hrRemarks) && (
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#166534' }}>{r.hrRemarks || r.rmRemarks}</div>
                  )}
                </td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {applyOpen && (
        <div style={{ marginTop: '1.25rem', padding: '1.5rem', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: '0 0 1.1rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>New leave request</h4>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
            <div>
              <label style={labelStyle}>Leave type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
                {enabledTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="__other__">Other (please specify)</option>
              </select>
            </div>
            {type === '__other__' && (
              <div>
                <label style={labelStyle}>Please specify</label>
                <input type="text" placeholder="e.g. Bereavement leave" value={typeOther} onChange={(e) => setTypeOther(e.target.value)} style={inputStyle} />
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                <label style={labelStyle}>From</label>
                <input type="date" value={from} min={tomorrow} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                <label style={labelStyle}>To</label>
                <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for leave…" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5 }}>Leave can only be applied for future dates, starting tomorrow. For today or a past date, use Regularization instead.</div>
            {submitError && (
              <div style={{ padding: '0.6rem 0.85rem', background: '#fef2f2', color: '#991b1b', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #fca5a5' }}>{submitError}</div>
            )}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" onClick={submit} disabled={submitting} style={{ padding: '0.6rem 1.1rem', background: submitting ? '#a0aec0' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button type="button" onClick={() => setApplyOpen(false)} disabled={submitting} style={{ padding: '0.6rem 1.1rem', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
