'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { allocateLeave } from '@/modules/hr-tool/utils/leave-balance';

interface LeaveRequestRow {
  id: string; type: string; from: string; to: string; remarks: string;
  status: string; rmRemarks: string; hrRemarks: string;
  halfDay?: 'first' | 'second' | null;
  /** Server-computed split (allocateLeave) — exactly what payroll pays. */
  paidDays?: number; unpaidDays?: number;
}
interface LeaveMeData {
  linked?: boolean;
  leaveRequests?: LeaveRequestRow[];
  leaveTypes?: Record<string, { enabled: boolean; perMonth: number }>;
  leaveBalance?: Record<string, number>;
  /** Inputs for previewing a new request's paid/unpaid split before it's sent. */
  doj?: string;
  holidays?: string[];
}
const HALF_LABEL: Record<string, string> = { first: 'first half', second: 'second half' };

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
  cancelled: { tone: 'bg-slate-100 text-slate-600', label: 'Cancelled' },
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
  if (r.status === 'cancelled' && r.hrRemarks) {
    return <div className="mt-1 text-[0.8rem] text-slate-500">{r.hrRemarks}</div>;
  }
  if (r.status === 'approved' && (r.rmRemarks || r.hrRemarks)) {
    return <div className="mt-1 text-[0.8rem] text-green-800">{r.hrRemarks || r.rmRemarks}</div>;
  }
  return null;
}

const dateRange = (r: LeaveRequestRow) => `${r.from}${r.to !== r.from ? ` – ${r.to}` : ''}${r.halfDay ? ` (${HALF_LABEL[r.halfDay]})` : ''}`;

/** Paid/unpaid split, only for requests that hold balance. */
function SplitNote({ r }: { r: LeaveRequestRow }) {
  if ((r.status !== 'pending' && r.status !== 'approved') || r.paidDays === undefined) return null;
  if (!r.unpaidDays) return <div className="mt-1 text-[0.8rem] text-slate-500">{r.paidDays} paid</div>;
  return <div className="mt-1 text-[0.8rem] text-red-700">{r.paidDays} paid + {r.unpaidDays} unpaid (not enough balance)</div>;
}

/** The viewer's own calendar date — not the UTC one, which is still "yesterday" in India until 05:30. */
function localTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
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

/** Self-service "Apply for Leave" — own request history (with each request's paid/unpaid split
 * and a Cancel button — any time while pending, until it starts once approved) plus a form to submit a new one for today, yesterday or
 * later, full or half day. Every rule is enforced by HrToolService.submitEmployeeLeaveRequest;
 * the form only previews the split with the same allocateLeave payroll pays by. Same apiBase/getHeaders prop-injection pattern as
 * AttendanceWidget/DocumentsWidget — used as-is on both the plain-employee and Publisher/Event
 * Admin surfaces. */
export default function LeaveWidget({ apiBase = '/api/admin/leave-requests', getHeaders = getAuthHeaders }: LeaveWidgetProps) {
  const [data, setData] = useState<LeaveMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [applyOpen, setApplyOpen] = useState(false);
  const [type, setType] = useState('');
  const today = localTodayStr();
  const yesterday = addDaysStr(today, -1);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [halfDay, setHalfDay] = useState<'' | 'first' | 'second'>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
    setFrom(today);
    setTo(today);
    setHalfDay('');
    setReason('');
    setSubmitError('');
    setApplyOpen(true);
  }

  async function submit() {
    const finalType = type;
    if (!finalType) { setSubmitError('No leave type is available — ask HR.'); return; }
    const trimmedReason = reason.trim();
    if (!trimmedReason) { setSubmitError('Please describe the reason.'); return; }
    if (to < from) { setSubmitError('The end date cannot be before the start date.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type: finalType, from, to: halfDay ? from : to, reason: trimmedReason, halfDay: halfDay || null }),
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

  async function cancelRequest(id: string) {
    if (!window.confirm('Cancel this leave? The days go back to your balance.')) return;
    setCancellingId(id);
    setError('');
    try {
      const res = await fetch(`${apiBase}/cancel`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ id }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to cancel the leave');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel the leave');
    } finally {
      setCancellingId(null);
    }
  }

  // Preview of the request being filled in, split with the same rule the server and payroll use.
  const preview = (() => {
    if (!applyOpen || !type || !from || (!halfDay && to < from)) return null;
    const draft = { id: 'L-9999999999999', type, from, to: halfDay ? from : to, status: 'pending', halfDay: halfDay || null };
    const others = (data?.leaveRequests || []).map((r) => ({ id: r.id, type: r.type, from: r.from, to: r.to, status: r.status, halfDay: r.halfDay || null }));
    return allocateLeave(data?.doj || '', data?.leaveTypes || {}, [...others, draft], today, data?.holidays || []).get(draft.id) || null;
  })();

  if (loading) return <div className={`${cardClass} text-slate-500`}>Loading leave requests…</div>;

  if (data?.linked === false) {
    return (
      <div className={cardClass}>
        <div className="text-slate-500">No Employee ID has been assigned to your account yet. Ask your Founder to assign one under HR Management → Assigning IDs to apply for leave.</div>
      </div>
    );
  }

  const requests = data?.leaveRequests || [];
  // A pending request can be withdrawn any time (e.g. they came in after all and need to punch in);
  // an approved one only until the leave starts — after that, HR. Same rule as the server.
  const canCancel = (r: LeaveRequestRow) => r.status === 'pending' || (r.status === 'approved' && today < r.from);
  const cancelButtonClass = 'mt-2 min-h-9 cursor-pointer rounded-lg border border-solid border-slate-300 bg-white px-3 text-[0.8rem] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60';

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
              {t}: {data?.leaveBalance?.[t] ?? 0} available
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
              </select>
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <select value={halfDay} onChange={(e) => { const v = e.target.value as '' | 'first' | 'second'; setHalfDay(v); if (v) setTo(from); }} className={inputClass}>
                <option value="">Full day(s)</option>
                <option value="first">Half day — first half</option>
                <option value="second">Half day — second half</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{halfDay ? 'Date' : 'From'}</label>
                <input type="date" value={from} min={yesterday} onChange={(e) => { setFrom(e.target.value); if (halfDay || to < e.target.value) setTo(e.target.value); }} className={inputClass} />
              </div>
              {!halfDay && (
                <div>
                  <label className={labelClass}>To</label>
                  <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>
            {preview && (preview.paid + preview.unpaid > 0) && (
              <div className={`rounded-lg px-3.5 py-2.5 text-[0.8rem] ${preview.unpaid > 0 ? 'border border-solid border-amber-300 bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'}`}>
                {preview.unpaid > 0
                  ? `${preview.paid} paid + ${preview.unpaid} unpaid — you don't have enough balance, so the extra days will be deducted from salary.`
                  : `${preview.paid} day${preview.paid === 1 ? '' : 's'} from your balance.`}
              </div>
            )}
            <div>
              <label className={labelClass}>Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for leave…" className={`${inputClass} resize-y font-[inherit]`} />
            </div>
            <div className="text-xs leading-relaxed text-slate-400">You can apply for today, yesterday or a future date. Sundays and holidays inside the leave aren&apos;t counted. Full-day leave isn&apos;t possible on a day you punched in — use half-day leave or Regularization.</div>
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
                <SplitNote r={r} />
                <ApproverRemark r={r} />
                {canCancel(r) && (
                  <button type="button" onClick={() => cancelRequest(r.id)} disabled={cancellingId === r.id} className={cancelButtonClass}>
                    {cancellingId === r.id ? 'Cancelling…' : 'Cancel leave'}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Desktop: table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse">
              <thead><tr><th className={thClass}>Type</th><th className={thClass}>Dates</th><th className={thClass}>Reason</th><th className={thClass}>Status</th><th className={thClass}></th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className={tdClass}>{typeLabel(r.type)}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{dateRange(r)}<SplitNote r={r} /></td>
                    <td className={tdClass}>
                      {r.remarks}
                      <ApproverRemark r={r} />
                    </td>
                    <td className={tdClass}><StatusBadge status={r.status} /></td>
                    <td className={tdClass}>
                      {canCancel(r) && (
                        <button type="button" onClick={() => cancelRequest(r.id)} disabled={cancellingId === r.id} className={cancelButtonClass}>
                          {cancellingId === r.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </td>
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
