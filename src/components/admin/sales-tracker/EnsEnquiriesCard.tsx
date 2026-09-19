'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EnsTravelEnquiry } from '@/modules/ens-travel-enquiries/domain/types';
import { packageFor, PARTICIPATION_OPTIONS, participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import { LEAD_STATUS_FOLLOWED_UP, LEAD_STATUS_OPTIONS, leadStatusLabel, NO_STATUS_LABEL } from '@/modules/ens-travel-enquiries/domain/lead-status';
import { foundUsText, NO_REFERRER_LABEL, REFERRED_BY_OPTIONS, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import EnsEnquiryDetailModal, { leadStatusBadge, participationBadge } from './EnsEnquiryDetailModal';
import { fetchEnsEnquiries } from './ensEnquiriesApi';
import { formatSubmittedOn, timestampMs } from './sponsorEventFormat';

type View = 'all' | 'recent' | 'delegate' | 'booth' | 'others' | 'followup';

const VIEW_LABELS: Record<View, string> = {
  all: 'All enquiries',
  recent: 'Received in the last 30 days',
  delegate: 'Delegation (one or two delegates)',
  booth: 'Booth / POD (one or two persons)',
  others: 'Others — own requirement',
  followup: 'Followed up, plus leads with no conversation yet',
};

/** The Lead status filter's value for enquiries nobody has spoken to yet (stored as NULL). */
const STATUS_FILTER_NONE = '__none__';
/** The Referred by filter's value for enquiries that named no referrer (stored as NULL). */
const REFERRER_FILTER_NONE = '__none__';

const DAY_MS = 24 * 60 * 60 * 1000;

function inView(e: EnsTravelEnquiry, view: View, since: number): boolean {
  if (view === 'recent') return timestampMs(e.createdAt) >= since;
  if (view === 'delegate') return packageFor(e.participation) === 'delegate';
  if (view === 'booth') return packageFor(e.participation) === 'booth';
  if (view === 'others') return packageFor(e.participation) === null;
  // The team's to-do list: leads they've followed up and leads nobody has spoken to yet.
  if (view === 'followup') return e.leadStatus === LEAD_STATUS_FOLLOWED_UP || e.leadStatus === null;
  return true;
}

/** The Sales Tracker's own block for the /expand-north-star "Plan your visit" form: KPI tiles, a
 * table of every enquiry, and a detail view where an admin can read and edit each one.
 *
 * Kept apart from All leads and from the other pages' cards on purpose — these carry a package
 * (delegation, booth / POD, or a free-text requirement), their own received / last-updated dates
 * and the team's own Lead status (Confirmed / Followed Up / Cancelled, with a conversation note
 * under Followed Up). The "Followed Up Leads" tile is the working list: followed-up leads plus the
 * ones nobody has spoken to yet. They are NOT mirrored into All leads — this card is the only place
 * they appear, and their status is worked here.
 *
 * Loads its own data rather than riding on useSalesTrackerData: a separate endpoint and table, and a
 * failure here should never blank the leads above and below it. Edits update the row in place. */
export default function EnsEnquiriesCard() {
  const [enquiries, setEnquiries] = useState<EnsTravelEnquiry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [search, setSearch] = useState('');
  const [participationFilter, setParticipationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [referrerFilter, setReferrerFilter] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setEnquiries(await fetchEnsEnquiries());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Expand North Star enquiries');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const since = Date.now() - 30 * DAY_MS;
    const count = (v: View) => enquiries.filter((e) => inView(e, v, since)).length;
    return {
      all: enquiries.length,
      recent: count('recent'),
      delegate: count('delegate'),
      booth: count('booth'),
      others: count('others'),
      followup: count('followup'),
    };
  }, [enquiries]);

  const rows = useMemo(() => {
    if (!view) return [];
    const since = Date.now() - 30 * DAY_MS;
    const q = search.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (!inView(e, view, since)) return false;
      if (participationFilter && e.participation !== participationFilter) return false;
      if (statusFilter === STATUS_FILTER_NONE ? e.leadStatus !== null : statusFilter && e.leadStatus !== statusFilter) return false;
      if (referrerFilter === REFERRER_FILTER_NONE ? e.referredBy !== '' : referrerFilter && e.referredBy !== referrerFilter) return false;
      if (q) {
        const hay = [
          e.name, e.email, e.contact, e.city, e.country,
          participationLabel(e.participation), e.requirement,
          referredByLabel(e.referredBy), foundUsText(e.foundUs, e.foundUsDetail),
          leadStatusLabel(e.leadStatus), e.conversationNote,
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enquiries, view, search, participationFilter, statusFilter, referrerFilter]);

  function toggle(next: View) {
    setView((current) => (current === next ? null : next));
  }

  function handleSaved(updated: EnsTravelEnquiry) {
    setEnquiries((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  }

  const active = activeId ? enquiries.find((e) => e.id === activeId) ?? null : null;

  const tiles: { key: View; label: string }[] = [
    { key: 'all', label: 'Expand North Star enquiries' },
    { key: 'recent', label: 'Last 30 days' },
    { key: 'delegate', label: 'Delegation' },
    { key: 'booth', label: 'Booth / POD' },
    { key: 'others', label: 'Others (own requirement)' },
    { key: 'followup', label: 'Followed Up Leads' },
  ];

  return (
    <div className="card">
      <div className="card-body" style={{ paddingTop: 20 }}>
        <div className="se-intro">
          <h2>Expand North Star enquiries</h2>
          <span className="hint">From the /expand-north-star “Plan your visit” form · kept separate from All leads and the other pages’ leads</span>
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
                <label htmlFor="ee-search">Search</label>
                <input id="ee-search" type="text" placeholder="Name, email, phone, city, country, referrer, source, requirement, conversation..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="field ee-filter">
                <label htmlFor="ee-filter">Participating as</label>
                <select id="ee-filter" value={participationFilter} onChange={(e) => setParticipationFilter(e.target.value)}>
                  <option value="">Any</option>
                  {PARTICIPATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="field ee-filter">
                <label htmlFor="ee-status-filter">Lead status</label>
                <select id="ee-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Any</option>
                  <option value={STATUS_FILTER_NONE}>{NO_STATUS_LABEL}</option>
                  {LEAD_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="field ee-filter">
                <label htmlFor="ee-referrer-filter">Referred by</label>
                <select id="ee-referrer-filter" value={referrerFilter} onChange={(e) => setReferrerFilter(e.target.value)}>
                  <option value="">Any</option>
                  <option value={REFERRER_FILTER_NONE}>{NO_REFERRER_LABEL}</option>
                  {REFERRED_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => void load()}>↻ Refresh</button>
              <span className="se-count">{VIEW_LABELS[view]} · {rows.length} shown</span>
            </div>

            <div className="table-wrap">
              <table className="se-table ee-table">
                <thead>
                  <tr>
                    <th>Received on</th>
                    <th>Full name</th>
                    <th>Email</th>
                    <th>Contact number</th>
                    <th>City</th>
                    <th>Country</th>
                    <th>Participating as</th>
                    <th>Referred by</th>
                    <th>How they found us</th>
                    <th>Lead status</th>
                    <th>Last updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={12} className="se-empty">{loaded ? 'No enquiries here yet.' : 'Loading…'}</td></tr>
                  ) : rows.map((e) => {
                    const badge = participationBadge(e.participation);
                    const status = leadStatusBadge(e.leadStatus);
                    return (
                      <tr
                        key={e.id}
                        tabIndex={0}
                        onClick={(ev) => { if ((ev.target as HTMLElement).closest('a, button')) return; setActiveId(e.id); }}
                        onKeyDown={(ev) => { if (ev.key === 'Enter' && ev.target === ev.currentTarget) setActiveId(e.id); }}
                      >
                        <td>{formatSubmittedOn(e.createdAt)}</td>
                        <td className="se-cell-title">{e.name}</td>
                        <td><a href={`mailto:${e.email}`}>{e.email}</a></td>
                        <td>{e.contact}</td>
                        <td>{e.city}</td>
                        <td>{e.country}</td>
                        <td>
                          <span className={`badge ee-badge is-${badge.tone}`}>{badge.label}</span>
                        </td>
                        <td>{e.referredBy ? referredByLabel(e.referredBy) : <span className="hint">{NO_REFERRER_LABEL}</span>}</td>
                        <td>{foundUsText(e.foundUs, e.foundUsDetail) || <span className="hint">Not provided</span>}</td>
                        <td>
                          <span className={`badge ee-status is-${status.tone}`} title={e.leadStatus === LEAD_STATUS_FOLLOWED_UP && e.conversationNote ? e.conversationNote : undefined}>{status.label}</span>
                        </td>
                        <td>{e.updatedAt ? formatSubmittedOn(e.updatedAt) : <span className="hint">Never edited</span>}</td>
                        <td><button type="button" className="small" onClick={() => setActiveId(e.id)}>View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {active && <EnsEnquiryDetailModal key={active.id} enquiry={active} onClose={() => setActiveId(null)} onSaved={handleSaved} />}
    </div>
  );
}
