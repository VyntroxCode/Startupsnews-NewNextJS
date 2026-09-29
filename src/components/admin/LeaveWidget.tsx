'use client';

import { useEffect, useState } from 'react';
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

/** Legacy type (Work From Home is discontinued) — only used to label past requests.
 * Must match WFH_LEAVE_TYPE in src/modules/hr-tool/domain/types.ts. */
const WFH_TYPE = 'WFH';
const typeLabel = (t: string) => (t === WFH_TYPE ? 'Work From Home' : t);

const cardClass = 'mt-4 rounded-xl border border-solid border-black/5 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm box-border sm:p-6 md:mt-6 md:p-8';
const thClass = 'border-b border-solid border-slate-200 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
const tdClass = 'border-b border-solid border-slate-100 px-3.5 py-3 align-top text-slate-900';
const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-slate-600';
// No Preflight here, so no global border-box — every full-width control sets `box-border`
// explicitly, otherwise its padding would push it wider than its container.
const inputClass = 'box-border min-h-11 w-full rounded-lg border border-solid border-slate-300 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm';

const STATUS_STYLE: Record<string, { tone: string; label: string }> = {
  pending: { tone: 'bg-orange-100 text-orange-700', label: 'Pending approval' },
  approved: { tone: 'bg-green-100 text-green-800', label: 'Approved' },
  rejected: { tone: 'bg-red-100 text-red-700', label: 'Rejected' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.tone}`}>
      {s.label}
    </span>
  );
}

function ApproverRemark({ r }: { r: LeaveRequestRow }) {
  if (r.status === 'rejected' && (r.rmRemarks || r.hrRemarks)) {
    return <div className="mt-1 text-[0.8rem] text-red-700">Rejected: {r.hrRemarks || r.rmRemarks}</div>;
  }
  if (r.status === 'approved' && (r.rmRemarks || r.hrRemarks)) {
    return <div className="mt-1 text-[0.8rem] text-green-800">{r.hrRemarks || r.rmRemarks}</div>;
  }
  return null;
}

const dateRange = (r: LeaveRequestRow) => `${r.from}${r.to !== r.from ? ` – ${r.to}` : ''}`;

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

  if (loading) return <div className={`${cardClass} text-slate-500`}>Loading leave requests…</div>;

  if (data?.linked === false) {
    return (
      <div className={cardClass}>
        <div className="text-slate-500">No Employee ID has been assigned to your account yet. Ask your Founder to assign one under HR Management → Assigning IDs to apply for leave.</div>
      </div>
    );
  }

  const requests = data?.leaveRequests || [];

  return (
    <div className={cardClass}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-lg font-bold text-slate-900">Leave</h3>
        {!applyOpen && (
          <button
            type="button"
            onClick={openApply}
            className="min-h-11 w-full cursor-pointer rounded-lg border-0 bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-600 sm:w-auto"
          >
            + Apply for Leave
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-solid border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {enabledTypes.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {enabledTypes.map((t) => (
            <span key={t} className="rounded-full bg-indigo-50 px-3 py-1 text-[0.8rem] font-semibold text-indigo-700">
              {t}: {data?.leaveBalance?.[t] ?? 0} left
            </span>
          ))}
        </div>
      )}

      {applyOpen && (
        <div className="mb-5 rounded-xl border border-solid border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h4 className="m-0 mb-4 text-[0.95rem] font-bold text-slate-900">New leave request</h4>
          <div className="grid max-w-[480px] gap-4">
            <div>
              <label className={labelClass}>Leave type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                {enabledTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="__other__">Other (please specify)</option>
              </select>
            </div>
            {type === '__other__' && (
              <div>
                <label className={labelClass}>Please specify</label>
                <input type="text" placeholder="e.g. Bereavement leave" value={typeOther} onChange={(e) => setTypeOther(e.target.value)} className={inputClass} />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>From</label>
                <input type="date" value={from} min={tomorrow} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>To</label>
                <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for leave…" className={`${inputClass} resize-y font-[inherit]`} />
            </div>
            <div className="text-xs leading-relaxed text-slate-400">Leave can only be applied for future dates, starting tomorrow. For today or a past date, use Regularization instead.</div>
            {submitError && (
              <div className="rounded-lg border border-solid border-red-300 bg-red-50 px-3.5 py-2.5 text-[0.8rem] text-red-800">{submitError}</div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
              <button type="button" onClick={submit} disabled={submitting} className="min-h-11 cursor-pointer rounded-lg border-0 bg-indigo-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button type="button" onClick={() => setApplyOpen(false)} disabled={submitting} className="min-h-11 cursor-pointer rounded-lg border border-solid border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-slate-500">No leave requests yet.</div>
      ) : (
        <>
          {/* Phone: one card per request. */}
          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-solid border-slate-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{typeLabel(r.type)}</div>
                    <div className="mt-0.5 text-sm tabular-nums text-slate-500">{dateRange(r)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.remarks && <div className="mt-2 break-words text-sm text-slate-700">{r.remarks}</div>}
                <ApproverRemark r={r} />
              </li>
            ))}
          </ul>

          {/* Desktop: table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse">
              <thead><tr><th className={thClass}>Type</th><th className={thClass}>Dates</th><th className={thClass}>Reason</th><th className={thClass}>Status</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className={tdClass}>{typeLabel(r.type)}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{dateRange(r)}</td>
                    <td className={tdClass}>
                      {r.remarks}
                      <ApproverRemark r={r} />
                    </td>
                    <td className={tdClass}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
