'use client';

import { useEffect, useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PAGE_LEAD_LABELS } from '@/components/admin/sales-tracker/constants';
import { formatSubmittedOn, whatsappLink } from '@/components/admin/sales-tracker/sponsorEventFormat';
import {
  type AssignedLead,
  assignmentStatusChipClass,
  assignmentStatusLabel,
  PICKABLE_ASSIGNMENT_STATUSES,
} from '@/modules/lead-assignments/domain/types';
import { FOLLOW_UP_NOTE_MAX_LENGTH, type LeadDetail, type LeadDetailField } from '@/modules/lead-followups/domain/types';

/** A DB timestamp as "29 Sep 2026, 14:05"; a bare "YYYY-MM-DD" (a manual lead's arrival date) as
 * just the day — formatSubmittedOn would read it as UTC midnight and print 05:30. */
function when(value: string): string {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return formatSubmittedOn(value) || value;
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${assignmentStatusChipClass(status)}`}>
      {assignmentStatusLabel(status)}
    </span>
  );
}

const NOT_PROVIDED = <span className="text-slate-400">Not provided</span>;

/** One submitted value, shown the way its kind reads best. Never an input — this view is read-only. */
function FieldValue({ field }: { field: LeadDetailField }) {
  const v = field.value;
  if (!v) return NOT_PROVIDED;
  switch (field.kind) {
    case 'email':
      return <a href={`mailto:${v}`} className="break-all text-indigo-600 hover:text-indigo-800">{v}</a>;
    case 'phone':
      return <a href={`tel:${v.replace(/\s+/g, '')}`} className="text-indigo-600 hover:text-indigo-800">{v}</a>;
    case 'url': {
      const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
      return <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-indigo-600 hover:text-indigo-800">{v} ↗</a>;
    }
    case 'image':
      return (
        <a href={v} target="_blank" rel="noopener noreferrer" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- a visitor-uploaded poster on the S3/CDN host */}
          <img src={v} alt="Uploaded poster" className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain" />
          <span className="mt-1 block text-xs text-indigo-600">Open full size ↗</span>
        </a>
      );
    case 'list':
      return (
        <ul className="m-0 list-disc pl-4 leading-6">
          {v.split('\n').map((line) => <li key={line}>{line}</li>)}
        </ul>
      );
    case 'long':
      return <span className="whitespace-pre-line">{v}</span>;
    default:
      return <span>{v}</span>;
  }
}

/** The lead window on My Leads: a slide-over from the right (full width on phones).
 *
 * Top to bottom: who the lead is with quick Call / WhatsApp / Email actions; everything the visitor
 * submitted on the page, read-only; the people on the lead with their statuses; the add-follow-up
 * form (status + message — the date is stamped by the server and can't be set here); and every
 * follow-up logged on the lead, newest first, by anyone assigned to it.
 *
 * `endpoint` is the list endpoint (/api/employee/leads or /api/admin/my-leads); the lead lives at
 * `${endpoint}/${source}/${leadId}`. `onChanged` hands a saved follow-up's refreshed view back so
 * the list can update its row without a reload. */
export default function LeadDetailDrawer({ lead, endpoint, getHeaders, onClose, onChanged }: {
  lead: AssignedLead;
  endpoint: string;
  getHeaders: () => HeadersInit;
  onClose: () => void;
  onChanged: (detail: LeadDetail) => void;
}) {
  const url = `${endpoint}/${lead.source}/${encodeURIComponent(lead.leadId)}`;
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEscapeKey(onClose);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { headers: getHeaders() });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load the lead');
        if (cancelled) return;
        setDetail(json.data);
        setStatus(json.data.leadStatus);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load the lead');
      }
    })();
    return () => { cancelled = true; };
  }, [url, getHeaders]);

  async function save() {
    if (!note.trim()) { setFormMsg({ kind: 'err', text: 'Please write the follow-up message.' }); return; }
    setSaving(true);
    setFormMsg(null);
    try {
      const res = await fetch(`${url}/follow-ups`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't save the follow-up");
      setDetail(json.data);
      onChanged(json.data);
      setNote('');
      setFormMsg({ kind: 'ok', text: 'Follow-up saved.' });
    } catch (err) {
      setFormMsg({ kind: 'err', text: err instanceof Error ? err.message : "Couldn't save the follow-up" });
    } finally {
      setSaving(false);
    }
  }

  const sub = detail?.submission;
  const name = sub?.name || lead.name || 'Lead';
  const contact = sub?.contact || lead.contact;
  const email = sub?.email || lead.email;
  const pageLabel = PAGE_LEAD_LABELS[lead.page] || (lead.source === 'lead' ? 'Added manually' : lead.page);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{pageLabel}</span>
                <StatusChip status={detail?.leadStatus ?? lead.status} />
              </div>
              <h2 id="lead-drawer-title" className="m-0 mt-2 break-words text-xl font-bold text-slate-900">{name}</h2>
              <p className="m-0 mt-1 text-xs text-slate-500">
                Arrived {when(sub?.submittedAt || lead.leadDate)} · Assigned to you {when(lead.assignedAt)}
                {lead.assignedBy ? ` by ${lead.assignedBy}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              ×
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {contact && (
              <>
                <a href={`tel:${contact.replace(/\s+/g, '')}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline hover:border-indigo-300 hover:text-indigo-700">Call</a>
                <a href={whatsappLink(contact)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline hover:border-emerald-300 hover:text-emerald-700">WhatsApp ↗</a>
              </>
            )}
            {email && (
              <a href={`mailto:${email}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline hover:border-indigo-300 hover:text-indigo-700">Email</a>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!detail && !loadError && <p className="py-10 text-center text-sm text-slate-500">Loading the lead…</p>}
          {loadError && <p className="py-10 text-center text-sm text-red-700">{loadError}</p>}

          {detail && sub && (
            <div className="flex flex-col gap-5">
              <section>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-slate-500">Submitted details</h3>
                  <span className="text-xs text-slate-400">
                    {sub.origin === 'submission' ? `As filled on the ${pageLabel} page · view only` : 'From the Sales Tracker · view only'}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {sub.sections.map((section) => (
                    <div key={section.title} className="rounded-xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">{section.title}</div>
                      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-[170px_1fr]">
                        {section.fields.map((f) => (
                          <div key={f.label} className="contents">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:pt-0.5">{f.label}</dt>
                            <dd className="m-0 text-sm text-slate-800"><FieldValue field={f} /></dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Assigned team</h3>
                <div className="flex flex-wrap gap-2">
                  {detail.assignees.map((a) => (
                    <span key={a.credentialId} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                      {a.employeeName || 'Former employee'}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-indigo-200 bg-white p-4">
                <h3 className="m-0 text-base font-bold text-slate-900">Add a follow-up</h3>
                <p className="m-0 mt-1 text-xs text-slate-500">Date and time are added automatically when you save. The status you pick becomes the lead&apos;s status, and the admin sees every follow-up.</p>
                <div className="mt-3 flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                    Status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      {PICKABLE_ASSIGNMENT_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                    Follow-up message
                    <textarea
                      value={note}
                      maxLength={FOLLOW_UP_NOTE_MAX_LENGTH}
                      onChange={(e) => { setNote(e.target.value); if (formMsg?.kind === 'err') setFormMsg(null); }}
                      placeholder="What happened on the call / chat, and what was agreed next"
                      rows={4}
                      className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="self-end text-xs font-normal text-slate-400">{note.length} / {FOLLOW_UP_NOTE_MAX_LENGTH}</span>
                  </label>
                  {formMsg && (
                    <p role={formMsg.kind === 'err' ? 'alert' : 'status'} className={`m-0 text-sm ${formMsg.kind === 'err' ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formMsg.text}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void save()}
                      disabled={saving}
                      className="cursor-pointer rounded-lg border-0 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Save follow-up'}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Follow-ups {detail.followUps.length ? `(${detail.followUps.length})` : ''}
                </h3>
                {detail.followUps.length === 0 ? (
                  <p className="m-0 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    No follow-ups yet. Add the first one above after you speak to the lead.
                  </p>
                ) : (
                  <ol className="m-0 flex list-none flex-col gap-3 p-0">
                    {detail.followUps.map((f) => (
                      <li key={f.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {f.mine ? 'You' : f.authorName || 'Former employee'}
                            <span className="ml-2 text-xs font-normal text-slate-400">{when(f.createdAt)}</span>
                          </div>
                          <StatusChip status={f.status} />
                        </div>
                        <p className="m-0 mt-2 whitespace-pre-line text-sm text-slate-700">{f.note}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
