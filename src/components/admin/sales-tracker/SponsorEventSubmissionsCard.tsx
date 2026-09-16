'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SponsorEventSubmission } from '@/modules/sponsor-event-submissions/domain/types';
import SponsorEventDetailModal from './SponsorEventDetailModal';
import { fetchSponsorEventSubmissions } from './sponsorEventsApi';
import { formatEventDate, formatEventTime, formatSubmittedOn, timestampMs, todayKey } from './sponsorEventFormat';

type View = 'all' | 'recent' | 'upcoming' | 'past';

const VIEW_LABELS: Record<View, string> = {
  all: 'All submissions',
  recent: 'Received in the last 30 days',
  upcoming: 'Upcoming events',
  past: 'Past events',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Sales Tracker's own block for /sponsor-event. These are events — title, schedule, poster,
 * description — not person-and-company leads, so they get their own KPI tiles, their own table
 * columns and a full-detail view instead of being squeezed into All leads' columns. (Each one is
 * still mirrored into All leads under "Sponsor Event Page Leads" for status/assignee/follow-ups.)
 *
 * Loads its own data rather than riding on useSalesTrackerData: it is a separate endpoint and a
 * separate table, and a failure here should never blank the leads above and below it. */
export default function SponsorEventSubmissionsCard() {
  const [submissions, setSubmissions] = useState<SponsorEventSubmission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<SponsorEventSubmission | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setSubmissions(await fetchSponsorEventSubmissions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sponsor event submissions');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const today = todayKey();
    const since = Date.now() - 30 * DAY_MS;
    return {
      all: submissions.length,
      recent: submissions.filter((s) => timestampMs(s.createdAt) >= since).length,
      upcoming: submissions.filter((s) => s.eventDate >= today).length,
      past: submissions.filter((s) => s.eventDate && s.eventDate < today).length,
    };
  }, [submissions]);

  const rows = useMemo(() => {
    if (!view) return [];
    const today = todayKey();
    const since = Date.now() - 30 * DAY_MS;
    const q = search.trim().toLowerCase();
    const list = submissions.filter((s) => {
      if (view === 'recent' && !(timestampMs(s.createdAt) >= since)) return false;
      if (view === 'upcoming' && !(s.eventDate >= today)) return false;
      if (view === 'past' && !(s.eventDate && s.eventDate < today)) return false;
      if (q) {
        const hay = [s.eventTitle, s.location, s.contactName, s.contactEmail, s.phone].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Upcoming reads best soonest-first; everything else newest-first.
    if (view === 'upcoming') return [...list].sort((a, b) => `${a.eventDate} ${a.eventTime}`.localeCompare(`${b.eventDate} ${b.eventTime}`));
    if (view === 'past') return [...list].sort((a, b) => `${b.eventDate} ${b.eventTime}`.localeCompare(`${a.eventDate} ${a.eventTime}`));
    return list;
  }, [submissions, view, search]);

  function toggle(next: View) {
    setView((current) => (current === next ? null : next));
  }

  const tiles: { key: View; label: string }[] = [
    { key: 'all', label: 'Sponsor Event submissions' },
    { key: 'recent', label: 'Last 30 days' },
    { key: 'upcoming', label: 'Upcoming events' },
    { key: 'past', label: 'Past events' },
  ];

  const today = todayKey();

  return (
    <div className="card">
      <div className="card-body" style={{ paddingTop: 20 }}>
        <div className="se-intro">
          <h2>Sponsor Event submissions</h2>
          <span className="hint">From /sponsor-event · also listed in All leads as “Sponsor Event Page Leads”</span>
        </div>

        <div className="metrics" style={{ marginTop: 14, marginBottom: view ? 18 : 0 }}>
          {tiles.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`metric metric-btn${view === t.key ? ' active' : ''}`}
              aria-expanded={view === t.key}
              onClick={() => toggle(t.key)}
            >
              <div className="num">{loaded ? counts[t.key] : '…'}</div>
              <div className="lbl">{t.label}</div>
              <div className="metric-cta">
                {view === t.key ? 'Hide table' : 'View details'} <span className={`chev${view === t.key ? ' open' : ''}`}>&#8250;</span>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="msg err" style={{ marginTop: 14 }}>
            {error} <button type="button" className="small" onClick={() => void load()}>Retry</button>
          </div>
        )}

        {view && (
          <>
            <div className="se-toolbar">
              <div className="field">
                <label htmlFor="se-search">Search</label>
                <input id="se-search" type="text" placeholder="Event, location, name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button type="button" onClick={() => void load()}>↻ Refresh</button>
              <span className="se-count">{VIEW_LABELS[view]} · {rows.length} shown</span>
            </div>

            <div className="table-wrap">
              <table className="se-table">
                <thead>
                  <tr>
                    <th>Submitted on</th>
                    <th>Poster</th>
                    <th>Event</th>
                    <th>Event date</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Contact name</th>
                    <th>Email</th>
                    <th>Phone / WhatsApp</th>
                    <th>External link</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={11} className="se-empty">{loaded ? 'No submissions here yet.' : 'Loading…'}</td></tr>
                  ) : rows.map((s) => {
                    const upcoming = s.eventDate >= today;
                    return (
                      <tr key={s.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a, button')) return; setActive(s); }}>
                        <td>{formatSubmittedOn(s.createdAt)}</td>
                        <td>
                          {s.posterUrl
                            // eslint-disable-next-line @next/next/no-img-element -- visitor-uploaded URL; see SponsorEventDetailModal
                            ? <img className="se-thumb" src={s.posterUrl} alt="" loading="lazy" />
                            : <span className="hint">—</span>}
                        </td>
                        <td className="se-cell-title">{s.eventTitle}</td>
                        <td>
                          {formatEventDate(s.eventDate)}
                          <span className={`badge se-when${upcoming ? '' : ' se-past'}`}>{upcoming ? 'Upcoming' : 'Past'}</span>
                        </td>
                        <td>{formatEventTime(s.eventTime)}</td>
                        <td>{s.location}</td>
                        <td>{s.contactName}</td>
                        <td><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></td>
                        <td>{s.phone || <span className="hint">—</span>}</td>
                        <td>
                          {s.externalUrl
                            ? <a href={s.externalUrl} target="_blank" rel="noopener noreferrer">Open ↗</a>
                            : <span className="hint">—</span>}
                        </td>
                        <td><button type="button" className="small" onClick={() => setActive(s)}>View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {active && <SponsorEventDetailModal submission={active} onClose={() => setActive(null)} />}
    </div>
  );
}
