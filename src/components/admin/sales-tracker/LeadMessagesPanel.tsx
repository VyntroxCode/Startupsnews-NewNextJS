'use client';

import { useEffect, useState } from 'react';
import type { LeadSource } from '@/modules/lead-assignments/domain/types';
import { LEAD_MESSAGE_MAX_LENGTH, type LeadMessage } from '@/modules/lead-followups/domain/types';
import { salesTrackerApi } from './api';
import { formatSubmittedOn } from './sponsorEventFormat';

/** "Message for assigned employees" in the Sales Tracker lead windows (LeadFormModal,
 * EnsEnquiryDetailModal): the admin's instructions to the people on the lead, which every assigned
 * employee reads at the top of the lead in My Leads.
 *
 * - The message box shows only once the lead has at least one department AND one
 *   person (`canWrite`). The text is a controlled draft — the window's own Save sends it, after the
 *   assignment, and clears it.
 * - Below it, every message sent so far, newest first, with who wrote it and when (the server's
 *   timestamp). Messages are never edited; a new one is added instead. Fetched on open and again
 *   whenever `refreshKey` changes (the window bumps it after a save). A new lead has no history. */
export default function LeadMessagesPanel({ source, leadId, canWrite, value, onChange, refreshKey = 0, idPrefix }: {
  source: LeadSource;
  /** Empty for a lead that isn't saved yet. */
  leadId: string;
  canWrite: boolean;
  value: string;
  onChange: (next: string) => void;
  refreshKey?: number;
  idPrefix: string;
}) {
  const [messages, setMessages] = useState<LeadMessage[] | null>(leadId ? null : []);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    salesTrackerApi.getMessages(source, leadId)
      .then((m) => { if (!cancelled) { setMessages(m); setError(''); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load messages'); });
    return () => { cancelled = true; };
  }, [source, leadId, refreshKey]);

  return (
    <section className="ee-panel fu-panel">
      <header className="ee-panel-head">
        <h3>Message for assigned employees{messages?.length ? ` (${messages.length})` : ''}</h3>
        <span>Everyone assigned sees this on the lead in My Leads</span>
      </header>

      {canWrite ? (
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor={`${idPrefix}-lead-message`}>New message</label>
          <textarea
            id={`${idPrefix}-lead-message`}
            maxLength={LEAD_MESSAGE_MAX_LENGTH}
            placeholder="What should the assigned people do? e.g. Call them before Friday and share the delegation deck"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="hint">Optional · sent when you save · earlier messages stay below · {value.length} / {LEAD_MESSAGE_MAX_LENGTH}</div>
        </div>
      ) : (
        <p className="ee-panel-note" style={{ marginTop: 0, marginBottom: 12 }}>Pick a department and at least one person under Assigned to, then you can write them a message here.</p>
      )}

      {error ? (
        <div className="msg err">Couldn&apos;t load the messages for this lead ({error}). Close and reopen the lead to try again.</div>
      ) : !messages ? (
        <p className="hint">Loading messages…</p>
      ) : messages.length === 0 ? (
        <p className="ee-panel-note" style={{ marginTop: 0 }}>
          <strong>No messages on this lead yet.</strong>{' '}
          Messages you send will be listed here.
        </p>
      ) : (
        <ol className="fu-list">
          {messages.map((m) => (
            <li className="fu-item" key={m.id}>
              <div className="fu-item-head">
                <strong>{m.authorName || 'Admin'}</strong>
                <span className="hint">{formatSubmittedOn(m.createdAt)}</span>
              </div>
              <p className="fu-note">{m.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
