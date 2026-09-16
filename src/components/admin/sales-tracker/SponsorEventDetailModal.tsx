'use client';

import { useEffect } from 'react';
import type { SponsorEventSubmission } from '@/modules/sponsor-event-submissions/domain/types';
import { formatEventDate, formatEventTime, formatSubmittedOn, todayKey, whatsappLink } from './sponsorEventFormat';

/** Read-only view of one /sponsor-event submission: the poster beside every field the visitor
 * gave, grouped the way the public form asked for them (event → description → contact). Nothing
 * here is editable — status, assignee and follow-ups are worked on the mirrored lead in All leads. */
export default function SponsorEventDetailModal({ submission: s, onClose }: {
  submission: SponsorEventSubmission;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const upcoming = !!s.eventDate && s.eventDate >= todayKey();
  const replySubject = encodeURIComponent(`Re: ${s.eventTitle} — StartupNews.fyi partnership`);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box se-modal" role="dialog" aria-modal="true" aria-labelledby="se-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="se-modal-title">{s.eventTitle}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-meta">
            Sponsor Event submission · received {formatSubmittedOn(s.createdAt)} · ID {s.id}
          </div>

          <div className="se-detail">
            <div className="se-poster">
              {s.posterUrl ? (
                <>
                  <a href={s.posterUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- visitor-uploaded URL on an arbitrary host; next/image would need every such host allow-listed */}
                    <img src={s.posterUrl} alt={`Poster for ${s.eventTitle}`} />
                  </a>
                  <a className="se-poster-link" href={s.posterUrl} target="_blank" rel="noopener noreferrer">Open full-size poster ↗</a>
                </>
              ) : (
                <div className="se-poster-empty">No poster</div>
              )}
            </div>

            <div>
              <section className="se-section">
                <h3>Event</h3>
                <dl className="se-kv">
                  <dt>Event title</dt><dd>{s.eventTitle}</dd>
                  <dt>Event URL</dt><dd>startupnews.fyi/events/{s.eventSlug}</dd>
                  <dt>Date</dt>
                  <dd>
                    {formatEventDate(s.eventDate)}
                    <span className={`badge se-when${upcoming ? '' : ' se-past'}`}>{upcoming ? 'Upcoming' : 'Past'}</span>
                  </dd>
                  <dt>Time</dt><dd>{formatEventTime(s.eventTime)}</dd>
                  <dt>Location</dt><dd>{s.location}</dd>
                  <dt>Country</dt><dd>{s.country || <span className="hint">—</span>}</dd>
                  <dt>City</dt><dd>{s.city || <span className="hint">—</span>}</dd>
                  <dt>External link</dt>
                  <dd>
                    {s.externalUrl
                      ? <a href={s.externalUrl} target="_blank" rel="noopener noreferrer">{s.externalUrl}</a>
                      : <span className="hint">Not provided</span>}
                  </dd>
                </dl>
              </section>

              <section className="se-section">
                <h3>Description</h3>
                <p className="se-desc">{s.description}</p>
              </section>

              <section className="se-section">
                <h3>Contact</h3>
                <dl className="se-kv">
                  <dt>Name</dt><dd>{s.contactName}</dd>
                  <dt>Email</dt><dd><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></dd>
                  <dt>Phone / WhatsApp</dt>
                  <dd>
                    {s.phone ? (
                      <>
                        <a href={`tel:${s.phone.replace(/\s+/g, '')}`}>{s.phone}</a>
                        {' · '}
                        <a href={whatsappLink(s.phone)} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
                      </>
                    ) : <span className="hint">Not provided</span>}
                  </dd>
                </dl>
              </section>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Close</button>
          <a className="se-btn-link" href={`mailto:${s.contactEmail}?subject=${replySubject}`}>Reply by email</a>
        </div>
      </div>
    </div>
  );
}
