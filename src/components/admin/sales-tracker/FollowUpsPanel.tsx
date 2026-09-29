'use client';

import { useEffect, useState } from 'react';
import { ASSIGNMENT_STATUS_COLORS, assignmentStatusLabel, type LeadSource } from '@/modules/lead-assignments/domain/types';
import type { LeadFollowUpsView } from '@/modules/lead-followups/domain/types';
import { salesTrackerApi } from './api';
import { formatSubmittedOn } from './sponsorEventFormat';

function StatusPill({ status }: { status: string }) {
  const [bg, fg] = ASSIGNMENT_STATUS_COLORS[status] || ['#F1F5F9', '#475569'];
  return <span className="badge" style={{ background: bg, color: fg, whiteSpace: 'nowrap' }}>{assignmentStatusLabel(status)}</span>;
}

/** "Employee follow-ups" in the Sales Tracker lead windows (LeadFormModal, EnsEnquiryDetailModal):
 * who is on the lead, then every follow-up they logged from My Leads — who, when (the server's
 * timestamp), the status they set (which also became the lead's status) and their message. Read-only: follow-ups are
 * written only by the assigned employees. Fetched on open, so it's always the latest. */
export default function FollowUpsPanel({ source, leadId }: { source: LeadSource; leadId: string }) {
  const [view, setView] = useState<LeadFollowUpsView | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    salesTrackerApi.getFollowUps(source, leadId)
      .then((v) => { if (!cancelled) setView(v); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load follow-ups'); });
    return () => { cancelled = true; };
  }, [source, leadId]);

  return (
    <section className="ee-panel fu-panel">
      <header className="ee-panel-head">
        <h3>Employee follow-ups{view?.followUps.length ? ` (${view.followUps.length})` : ''}</h3>
        <span>Logged by the assigned employees from My Leads · read-only</span>
      </header>
      {error ? (
        <div className="msg err">{error}</div>
      ) : !view ? (
        <p className="hint">Loading follow-ups…</p>
      ) : (
        <>
          {view.assignees.length > 0 && (
            <div className="fu-team">
              {view.assignees.map((a) => (
                <span className="fu-person" key={a.credentialId}>
                  {a.employeeName || 'Former employee'}
                </span>
              ))}
            </div>
          )}
          {view.followUps.length === 0 ? (
            <p className="ee-panel-note">
              {view.assignees.length ? 'No follow-ups yet. They appear here as soon as an assigned employee adds one.' : 'Nobody is assigned to this lead, so no follow-ups can be added yet.'}
            </p>
          ) : (
            <ol className="fu-list">
              {view.followUps.map((f) => (
                <li className="fu-item" key={f.id}>
                  <div className="fu-item-head">
                    <strong>{f.authorName || 'Former employee'}</strong>
                    <span className="hint">{formatSubmittedOn(f.createdAt)}</span>
                    <StatusPill status={f.status} />
                  </div>
                  <p className="fu-note">{f.note}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
