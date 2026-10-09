'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, ClipboardCheck, CornerDownRight, PencilLine, RefreshCw, Reply, Send } from 'lucide-react';
import { ASSIGNMENT_STATUS_COLORS, assignmentStatusLabel, type LeadSource } from '@/modules/lead-assignments/domain/types';
import { adminEntryKind, FOLLOW_UP_REPLY_MAX_LENGTH, type LeadChange, type LeadFollowUpReply, type LeadFollowUpsView } from '@/modules/lead-followups/domain/types';
import { formatFollowUpDay } from '@/modules/lead-followups/domain/follow-up-date';
import { salesTrackerApi } from './api';
import { formatSubmittedOn } from './sponsorEventFormat';

function StatusPill({ status }: { status: string }) {
  const [bg, fg] = ASSIGNMENT_STATUS_COLORS[status] || ['#F1F5F9', '#475569'];
  return <span className="badge" style={{ background: bg, color: fg, whiteSpace: 'nowrap' }}>{assignmentStatusLabel(status)}</span>;
}

/** One line of the lead's history: a follow-up an assigned employee logged from My Leads, a status
 * change / conversation result the admin saved on the lead itself, or a plain edit of the lead
 * (other fields, or who is assigned). An admin entry lists what its save changed, old → new. */
type ActivityEntry = { kind: 'follow-up' | 'admin-update' | 'edit'; changes: LeadChange[]; id: number; at: string; author: string; text: string; status: string; nextFollowUpDate: string; replies: LeadFollowUpReply[] };

const KIND = {
  'follow-up': { label: 'Employee follow-up', Icon: ClipboardCheck, tag: 'bg-emerald-50 text-emerald-700', edge: 'border-l-4! border-l-emerald-500!' },
  'admin-update': { label: 'Admin status update', Icon: RefreshCw, tag: 'bg-amber-50 text-amber-800', edge: 'border-l-4! border-l-amber-500!' },
  edit: { label: 'Lead edited', Icon: PencilLine, tag: 'bg-indigo-50 text-indigo-700', edge: 'border-l-4! border-l-indigo-500!' },
} as const;

/** "Lead activity" — the last section of the Sales Tracker lead windows (LeadFormModal,
 * EnsEnquiryDetailModal). The lead's whole history in one timeline, newest first, with no cap:
 * every follow-up the assigned employees logged from My Leads (sales_lead_followups, each with the
 * status they set) and every status update the admin saved on the lead (same table, `byAdmin`),
 * tagged and colour-edged by kind, in the order the database returns them. Entries are never
 * edited; follow-ups are written only from My Leads.
 *
 * Every admin save that changes the lead is in here too, with what changed as old value → new
 * value (`changes`): detail fields, status, the admin's next follow-up date, departments and
 * assigned people — one entry per save. A save that changed neither the status nor wrote a
 * conversation result shows as "Lead edited". The assigned employees see the same entries in
 * My Leads. Edits made before this was recorded (2026-10-08) are not listed.
 *
 * Under each entry sits its conversation (sales_lead_followup_replies), oldest first: replies from
 * admins and from anyone assigned to the lead. **Reply** on an entry opens one box (one at a time)
 * that posts straight away, without saving the lead window; everyone on the lead then sees the
 * reply in My Leads and gets it as a new reply. Replies are never edited or deleted.
 *
 * Fetched on open, after a reply, and whenever `refreshKey` changes (the window bumps it after a
 * save). */
export default function LeadActivityPanel({ source, leadId, refreshKey = 0 }: {
  source: LeadSource;
  /** Empty for a lead that isn't saved yet. */
  leadId: string;
  refreshKey?: number;
}) {
  const [view, setView] = useState<LeadFollowUpsView | null>(leadId ? null : { assignees: [], followUps: [] });
  const [error, setError] = useState('');
  // The one open reply box: which entry it is under and what is typed in it.
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    salesTrackerApi.getFollowUps(source, leadId)
      .then((v) => { if (!cancelled) { setView(v); setError(''); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, [source, leadId, refreshKey]);

  const entries: ActivityEntry[] = (view?.followUps ?? []).map((f) => ({
    kind: f.byAdmin ? adminEntryKind(f) : 'follow-up', changes: f.changes, id: f.id, at: f.createdAt,
    author: f.authorName || (f.byAdmin ? 'Admin' : 'Former employee'), text: f.note, status: f.status, nextFollowUpDate: f.nextFollowUpDate, replies: f.replies,
  }));

  const count = (kind: ActivityEntry['kind']) => entries.filter((e) => e.kind === kind).length;
  const replyCount = entries.reduce((n, e) => n + e.replies.length, 0);

  function openReply(id: number | null) { setReplyTo(id); setReplyText(''); setReplyError(''); }

  async function sendReply(followUpId: number) {
    const message = replyText.trim();
    if (!message) { setReplyError('Please write the reply.'); return; }
    setSending(true);
    setReplyError('');
    try {
      setView(await salesTrackerApi.addReply(source, leadId, followUpId, message));
      openReply(null);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Couldn't save the reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="ee-panel fu-panel">
      <header className="ee-panel-head">
        <h3>Lead activity{entries.length ? ` (${entries.length})` : ''}</h3>
        <span>Status updates, every edit of this lead (what changed, by whom) and the follow-ups the assigned employees log from My Leads · newest first · reply under any of them</span>
      </header>

      {error ? (
        <div className="msg err">Couldn&apos;t load this lead&apos;s activity ({error}). Close and reopen the lead to try again.</div>
      ) : !view ? (
        <p className="hint">Loading activity…</p>
      ) : entries.length === 0 ? (
        leadId ? (
          <p className="ee-panel-note mt-0!">
            <strong>Nothing on this lead yet.</strong>{' '}
            Status updates, edits of this lead and the follow-ups the assigned employees add will be listed here, newest first.
          </p>
        ) : null
      ) : (
        <>
          <p className="hint mb-2">
            {count('admin-update')} admin status {count('admin-update') === 1 ? 'update' : 'updates'} · {count('edit')} {count('edit') === 1 ? 'edit' : 'edits'} · {count('follow-up')} employee {count('follow-up') === 1 ? 'follow-up' : 'follow-ups'} · {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </p>
          <ol className="fu-list">
            {entries.map((e) => {
              const { label, Icon, tag, edge } = KIND[e.kind];
              return (
                <li className={`fu-item ${edge}`} key={e.id}>
                  <div className="fu-item-head">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${tag}`}>
                      <Icon size={12} aria-hidden />{label}
                    </span>
                    <strong>{e.author}</strong>
                    <span className="hint">{formatSubmittedOn(e.at)}</span>
                    <StatusPill status={e.status} />
                  </div>
                  {e.text && <p className="fu-note">{e.text}</p>}
                  {e.changes.length > 0 && (
                    <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[12.5px]">
                      {e.changes.map((c) => (
                        <li key={c.field} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          <span className="font-semibold text-slate-700">{c.field}:</span>
                          <span className={c.from ? 'break-all text-slate-500 line-through' : 'text-slate-400'}>{c.from || 'empty'}</span>
                          <ArrowRight size={12} aria-label="changed to" className="shrink-0 self-center text-slate-400" />
                          <span className={c.to ? 'break-all font-semibold text-slate-900' : 'text-slate-400'}>{c.to || 'empty'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.nextFollowUpDate && (
                    <p className="hint mt-1.5! flex items-center gap-1"><CalendarClock size={12} aria-hidden />Next follow-up set for {formatFollowUpDay(e.nextFollowUpDate)}</p>
                  )}
                  {e.replies.length > 0 && (
                    <ol className="m-0 mt-2.5 flex list-none flex-col gap-2 border-0 border-l-2 border-solid border-slate-200 p-0 pl-3">
                      {e.replies.map((r) => (
                        <li key={r.id} className={`rounded-lg px-3 py-2 ${r.byAdmin ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                            <CornerDownRight size={12} aria-hidden className="text-slate-400" />
                            <strong>{r.authorName || (r.byAdmin ? 'Admin' : 'Former employee')}</strong>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.byAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{r.byAdmin ? 'Admin' : 'Employee'}</span>
                            <span className="hint">{formatSubmittedOn(r.createdAt)}</span>
                          </div>
                          <p className="fu-note mt-1!">{r.message}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                  {replyTo === e.id ? (
                    <div className="field mt-2.5">
                      <label htmlFor={`reply-${e.id}`}>Your reply to {e.author}</label>
                      <textarea
                        id={`reply-${e.id}`}
                        autoFocus
                        maxLength={FOLLOW_UP_REPLY_MAX_LENGTH}
                        placeholder="Write your reply. Everyone assigned to this lead will see it."
                        value={replyText}
                        onChange={(ev) => { setReplyText(ev.target.value); setReplyError(''); }}
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <span className="hint">Sent straight away · {replyText.length} / {FOLLOW_UP_REPLY_MAX_LENGTH}</span>
                        <span className="flex gap-2">
                          <button type="button" disabled={sending} onClick={() => openReply(null)}>Cancel</button>
                          <button type="button" className="primary" disabled={sending || !replyText.trim()} onClick={() => void sendReply(e.id)}>
                            <Send size={14} aria-hidden />{sending ? 'Sending…' : 'Send reply'}
                          </button>
                        </span>
                      </div>
                      {replyError && <div className="msg err mt-2! mb-0!" role="alert">{replyError}</div>}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <button type="button" disabled={sending} onClick={() => openReply(e.id)}><Reply size={14} aria-hidden />Reply</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
