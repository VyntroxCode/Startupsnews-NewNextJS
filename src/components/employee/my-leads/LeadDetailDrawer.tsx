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
import { adminEntryKind, FOLLOW_UP_NOTE_MAX_LENGTH, FOLLOW_UP_REPLY_MAX_LENGTH, type LeadDetail, type LeadDetailField } from '@/modules/lead-followups/domain/types';
import { followUpDue, formatFollowUpDay, localToday, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';

/** A DB timestamp as "29 Sep 2026, 14:05"; a bare "YYYY-MM-DD" (a manual lead's creation date) as
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
 * form (status + message + next follow-up date — the entry's own date is stamped by the server and
 * can't be set here); and every
 * follow-up logged on the lead, newest first, by anyone assigned to it. Under each entry sits its
 * conversation, oldest first: replies from admins and from anyone on the lead, with **Reply** to
 * add one (one box open at a time). Admin replies the reader hadn't seen before this visit are
 * marked "New"; loading the lead is what marks them seen (`onSeen`).
 *
 * The log also holds the admin's entries: status updates, and every edit of the lead ("Lead
 * edited") with what changed as old value → new value — detail fields, status, the admin's next
 * follow-up date, departments and assigned people.
 *
 * Next follow-up date is the reader's OWN date on the lead (other assignees and the admin keep
 * theirs). It is compulsory while the picked status leaves the lead open (Pending / Follow Up),
 * can't be in the past, and is not asked for when the status closes the lead. It is what puts the
 * lead in the reader's "Today's Follow up" on My Leads.
 *
 * `endpoint` is the list endpoint (/api/employee/leads or /api/admin/my-leads); the lead lives at
 * `${endpoint}/${source}/${leadId}`. `onChanged` hands a saved follow-up's refreshed view back so
 * the list can update its row without a reload. */
export default function LeadDetailDrawer({ lead, endpoint, getHeaders, onClose, onChanged, onSeen }: {
  lead: AssignedLead;
  endpoint: string;
  getHeaders: () => HeadersInit;
  onClose: () => void;
  onChanged: (detail: LeadDetail) => void;
  /** The lead has loaded — which is what marks the admin's replies as seen by the reader. */
  onSeen: () => void;
}) {
  const url = `${endpoint}/${lead.source}/${encodeURIComponent(lead.leadId)}`;
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const today = localToday();
  const needsDate = status ? statusNeedsFollowUpDate(status as LeadDetail['leadStatus']) : false;
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // The one open reply box: which entry it is under and what is typed in it.
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

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
        // A date still ahead is offered again; a missed one is left blank so a new one gets picked.
        setNextDate(json.data.nextFollowUpDate >= localToday() ? json.data.nextFollowUpDate : '');
        onSeen();
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load the lead');
      }
    })();
    return () => { cancelled = true; };
  // onSeen is the parent's inline handler (a new function each render) — leaving it out keeps the
  // lead from being re-fetched every time the list re-renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, getHeaders]);

  /** A refreshed view no longer flags replies as unread (they were marked seen when the drawer
   * opened); keep this visit's "New" marks until it's closed. */
  function keepNewMarks(next: LeadDetail): LeadDetail {
    const fresh = new Set((detail?.followUps ?? []).flatMap((f) => f.replies).filter((r) => r.unread).map((r) => r.id));
    if (!fresh.size) return next;
    return { ...next, followUps: next.followUps.map((f) => ({ ...f, replies: f.replies.map((r) => (fresh.has(r.id) ? { ...r, unread: true } : r)) })) };
  }

  function openReply(id: number | null) { setReplyTo(id); setReplyText(''); setReplyError(''); }

  async function sendReply(followUpId: number) {
    if (!replyText.trim()) { setReplyError('Please write the reply.'); return; }
    setReplying(true);
    setReplyError('');
    try {
      const res = await fetch(`${url}/replies`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId, message: replyText }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't save the reply");
      setDetail(keepNewMarks(json.data));
      openReply(null);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Couldn't save the reply");
    } finally {
      setReplying(false);
    }
  }

  async function save() {
    if (!note.trim()) { setFormMsg({ kind: 'err', text: 'Please write the follow-up message.' }); return; }
    if (needsDate && !nextDate) { setFormMsg({ kind: 'err', text: 'Please pick the next follow-up date.' }); return; }
    if (needsDate && nextDate < today) { setFormMsg({ kind: 'err', text: 'The next follow-up date cannot be in the past.' }); return; }
    setSaving(true);
    setFormMsg(null);
    try {
      const res = await fetch(`${url}/follow-ups`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, status, nextFollowUpDate: needsDate ? nextDate : '' }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't save the follow-up");
      setDetail(keepNewMarks(json.data));
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
  // The reader's stored date, shown in the header while the lead is still open.
  const myDate = detail && statusNeedsFollowUpDate(detail.leadStatus) ? detail.nextFollowUpDate : '';
  const myDue = followUpDue(myDate, today);

  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 z-[1000] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
      <div className="absolute top-0 right-0 bottom-0 left-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
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
                Created {when(sub?.submittedAt || lead.leadDate)} · Assigned to you {when(lead.assignedAt)}
                {lead.assignedBy ? ` by ${lead.assignedBy}` : ''}
              </p>
              {myDate && (
                <p className={`m-0 mt-1 text-xs font-semibold ${myDue === 'today' || myDue === 'overdue' ? 'text-red-700' : 'text-slate-600'}`}>
                  Your next follow-up: {formatFollowUpDay(myDate)}{myDue === 'today' ? ' · due today' : myDue === 'overdue' ? ' · overdue' : ''}
                </p>
              )}
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
                  {needsDate ? (
                    <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                      <span>Next follow-up date <span className="text-red-600">*</span></span>
                      <input
                        type="date"
                        value={nextDate}
                        min={today}
                        required
                        onChange={(e) => { setNextDate(e.target.value); if (formMsg?.kind === 'err') setFormMsg(null); }}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-xs font-normal text-slate-500">Your own date. On this day the lead shows in your Today&apos;s Follow up.</span>
                    </label>
                  ) : (
                    <p className="m-0 text-xs text-slate-500">This status closes the lead, so no next follow-up date is needed.</p>
                  )}
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
                  Follow-ups and edits {detail.followUps.length ? `(${detail.followUps.length})` : ''}
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
                            {f.mine ? 'You' : f.authorName || (f.byAdmin ? 'Admin' : 'Former employee')}
                            {f.byAdmin && (adminEntryKind(f) === 'edit'
                              ? <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Lead edited</span>
                              : <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Admin update</span>)}
                            <span className="ml-2 text-xs font-normal text-slate-400">{when(f.createdAt)}</span>
                          </div>
                          <StatusChip status={f.status} />
                        </div>
                        {f.note && <p className="m-0 mt-2 whitespace-pre-line text-sm text-slate-700">{f.note}</p>}
                        {f.changes.length > 0 && (
                          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm">
                            {f.changes.map((c) => (
                              <li key={c.field} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <span className="font-semibold text-slate-700">{c.field}:</span>
                                <span className={c.from ? 'break-all text-slate-500 line-through' : 'text-slate-400'}>{c.from || 'empty'}</span>
                                <span aria-label="changed to" className="text-slate-400">→</span>
                                <span className={c.to ? 'break-all font-semibold text-slate-900' : 'text-slate-400'}>{c.to || 'empty'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {f.nextFollowUpDate && (
                          <p className="m-0 mt-1.5 text-xs text-slate-500">Next follow-up set for {formatFollowUpDay(f.nextFollowUpDate)}</p>
                        )}
                        {f.replies.length > 0 && (
                          <ol className="m-0 mt-3 flex list-none flex-col gap-2 border-l-2 border-slate-200 p-0 pl-3">
                            {f.replies.map((r) => (
                              <li key={r.id} className={`rounded-lg px-3 py-2 ${r.unread ? 'bg-indigo-50 ring-1 ring-indigo-300' : r.byAdmin ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                                  {r.mine ? 'You' : r.authorName || (r.byAdmin ? 'Admin' : 'Former employee')}
                                  {r.byAdmin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Admin</span>}
                                  {r.unread && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">New</span>}
                                  <span className="text-xs font-normal text-slate-400">{when(r.createdAt)}</span>
                                </div>
                                <p className="m-0 mt-1 whitespace-pre-line text-sm text-slate-700">{r.message}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                        {replyTo === f.id ? (
                          <div className="mt-3 flex flex-col gap-2">
                            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                              Your reply
                              <textarea
                                autoFocus
                                value={replyText}
                                maxLength={FOLLOW_UP_REPLY_MAX_LENGTH}
                                onChange={(e) => { setReplyText(e.target.value); setReplyError(''); }}
                                placeholder="Write your reply. The admin and everyone on this lead will see it."
                                rows={3}
                                className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none"
                              />
                            </label>
                            {replyError && <p role="alert" className="m-0 text-sm text-red-700">{replyError}</p>}
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-400">{replyText.length} / {FOLLOW_UP_REPLY_MAX_LENGTH}</span>
                              <span className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openReply(null)}
                                  disabled={replying}
                                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void sendReply(f.id)}
                                  disabled={replying || !replyText.trim()}
                                  className="cursor-pointer rounded-lg border-0 bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {replying ? 'Sending…' : 'Send reply'}
                                </button>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openReply(f.id)}
                            disabled={replying}
                            className="mt-3 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
                          >
                            Reply{f.replies.length ? ` (${f.replies.length})` : ''}
                          </button>
                        )}
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
