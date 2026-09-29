'use client';

import { useEffect, useMemo, useState } from 'react';
import { PAGE_LEAD_FILTER_OPTIONS, PAGE_LEAD_LABELS } from '@/components/admin/sales-tracker/constants';
import {
  ASSIGNMENT_STATUS_OPTIONS,
  assignmentStatusChipClass,
  assignmentStatusLabel,
  FINISHED_LEAD_STATUSES,
  type AssignedLead,
} from '@/modules/lead-assignments/domain/types';
import type { LeadDetail } from '@/modules/lead-followups/domain/types';
import LeadDetailDrawer from './LeadDetailDrawer';

/** Leads added by hand in the Sales Tracker (sales_leads.type is a channel like "Social Media",
 * not one of the public pages) are grouped under this one card. */
const MANUAL = 'manual';
const MANUAL_LABEL = 'Added manually';

/** Wording and colours per status value: rows on the "Lead Status" card, and the table's Lead Status
 * dropdown (`filter`). */
const STATUS_ROW: Record<string, { label: string; filter: string; text: string; dot: string }> = {
  pending: { label: 'Pending leads', filter: 'Pending', text: 'text-amber-700', dot: 'bg-amber-500' },
  'follow-up': { label: 'Followed up leads', filter: 'Followed up', text: 'text-blue-700', dot: 'bg-blue-500' },
  confirmed: { label: 'Confirmed leads', filter: 'Confirmed', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'not-interested': { label: 'Not interested leads', filter: 'Not Interested', text: 'text-red-700', dot: 'bg-red-500' },
};

/** Where a lead stands for the KPI cards:
 *  - finished:  the lead's status is Confirmed or Not Interested — counted in the total only;
 *  - pending:   still open and nobody on the lead has logged a follow-up (no conversation yet);
 *  - followed:  still open and has at least one follow-up. */
type LeadStage = 'pending' | 'followed' | 'finished';

function stageOf(lead: AssignedLead): LeadStage {
  if (FINISHED_LEAD_STATUSES.includes(lead.status)) return 'finished';
  return lead.followUpCount > 0 ? 'followed' : 'pending';
}

function pageKey(lead: AssignedLead): string {
  return PAGE_LEAD_FILTER_OPTIONS.includes(lead.page) ? lead.page : MANUAL;
}

function pageLabel(key: string): string {
  return key === MANUAL ? MANUAL_LABEL : PAGE_LEAD_LABELS[key] || key;
}

/** "Yash Goswami" → "YG", for the row's avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** "2026-09-24 18:40:00" (IST, as the DB returns it) → "24 Sep 2026". */
function formatDay(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return value || '—';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** My Leads: every Sales Tracker lead assigned to the logged-in employee.
 *
 * One KPI card per page the leads came from (Feature Your Startup, Funding Round, Press Release,
 * Sponsor an Event, Expand North Star, plus "Added manually" when there are any), reading
 * "(pending + followed up) / total" as ONE number over the total, with "N pending · N followed up"
 * underneath (see stageOf — Closed and Not interested leads count only in the
 * total). A card with any pending lead blinks red until every one of them has a follow-up.
 * Clicking a card lists that page's still-open leads (pending + followed up); clicking it again,
 * or "Show all", goes back to every assigned lead.
 *
 * A "Lead Status" card comes last: every assigned lead across all pages, counted by its shared
 * status (Pending / Follow Up / Confirmed / Not Interested), each as "count / all leads". Clicking it
 * shows every assigned lead, finished ones included.
 *
 * Clicking a lead opens LeadDetailDrawer: everything the visitor submitted (read-only — nothing about
 * the lead itself can be edited here), and the follow-up log with an add form (status + message;
 * the date is the server's). A saved follow-up updates the row in place.
 *
 * Mounted twice: in the employee panel (/employee/leads → /api/employee/leads) and in the admin
 * panel for Event / Publisher Admins (/admin/my-leads → /api/admin/my-leads), whose HR login is
 * linked to their admin account. The admin route answers `linked: false` when there's no link. */
export default function MyLeadsPage({ endpoint, getHeaders }: {
  endpoint: string;
  getHeaders: () => HeadersInit;
}) {
  const [leads, setLeads] = useState<AssignedLead[] | null>(null);
  const [error, setError] = useState('');
  const [unlinked, setUnlinked] = useState(false);
  const [filter, setFilter] = useState('');
  // The table's "Lead Status" dropdown ('' = all statuses). Works on top of the card choice.
  const [statusFilter, setStatusFilter] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(endpoint, { headers: getHeaders() });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load your leads');
        setUnlinked(json.linked === false);
        setLeads(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your leads');
        setLeads([]);
      }
    })();
  }, [endpoint, getHeaders]);

  const cards = useMemo(() => {
    const list = leads || [];
    const keys = [...PAGE_LEAD_FILTER_OPTIONS, ...(list.some((l) => pageKey(l) === MANUAL) ? [MANUAL] : [])];
    return keys.map((key) => {
      const pageLeads = list.filter((l) => pageKey(l) === key);
      const count = (stage: LeadStage) => pageLeads.filter((l) => stageOf(l) === stage).length;
      return { key, total: pageLeads.length, pending: count('pending'), followed: count('followed') };
    });
  }, [leads]);

  // The "Lead Status" card: every assigned lead (all pages) counted by its shared status.
  const statusCounts = useMemo(
    () => ASSIGNMENT_STATUS_OPTIONS.map((o) => ({ ...o, count: (leads || []).filter((l) => l.status === o.value).length })),
    [leads]
  );

  // A page card shows that page's still-open leads only; no card picked = every assigned lead.
  // Card: a page card = that page's leads, the Lead Status card (no page) = all pages.
  // Status dropdown: narrows to that one status. With no status picked, a page card shows only its
  // open leads (pending + followed up); with one picked, it shows that page's leads in that status —
  // so Confirmed / Not Interested can be looked up per page too.
  const shown = useMemo(
    () => (leads || []).filter((l) => {
      if (filter && pageKey(l) !== filter) return false;
      if (statusFilter) return l.status === statusFilter;
      return !filter || stageOf(l) !== 'finished';
    }),
    [leads, filter, statusFilter]
  );

  const keyOf = (l: AssignedLead) => `${l.source}:${l.leadId}`;
  const openLead = openKey ? (leads || []).find((l) => keyOf(l) === openKey) ?? null : null;
  const filterLabel = pageLabel(filter);
  const tableTitle = statusFilter
    ? `${filter ? filterLabel : 'All pages'} — ${STATUS_ROW[statusFilter].filter}`
    : filter ? `${filterLabel} — pending & followed up` : 'All assigned leads';

  /** A saved follow-up changes the reader's status and the lead's follow-up count/date — patch the
   * row so the table and cards agree with the drawer without a reload. */
  function applyDetail(detail: LeadDetail) {
    setLeads((prev) => (prev || []).map((l) => (
      l.source === detail.source && l.leadId === detail.leadId
        ? { ...l, status: detail.leadStatus, followUpCount: detail.followUps.length, lastFollowUpAt: detail.followUps[0]?.createdAt ?? '' }
        : l
    )));
  }

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <h2 className="m-0 text-2xl font-bold tracking-tight text-slate-900 md:text-[2rem]">My Leads</h2>
        <p className="m-0 mt-1 text-sm text-slate-500 md:mt-2 md:text-base">
          Leads the sales team has assigned to you, grouped by the page they came from.
        </p>
      </div>

      {/* Phones: one swipeable row of KPI cards; from sm up the original grid. */}
      <div className={`-mx-4 mb-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-6 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 ${cards.length > 5 ? 'xl:grid-cols-7' : 'xl:grid-cols-6'}`}>
        {cards.map(({ key, total, pending, followed }) => {
          const active = filter === key;
          const alert = pending > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(active ? '' : key)}
              aria-pressed={active}
              aria-label={`${pageLabel(key)}: ${pending} pending, ${followed} followed up, ${total} total`}
              className={`relative w-[11rem] shrink-0 snap-start cursor-pointer overflow-hidden rounded-xl border p-3.5 text-left transition-colors sm:w-auto sm:p-4 ${
                alert
                  ? `border-red-400 bg-white hover:border-red-500 ${active ? 'ring-2 ring-red-300' : ''}`
                  : `bg-white hover:border-indigo-300 ${active ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`
              }`}
            >
              {/* The blink: a red wash pulsing behind the text, so the numbers stay fully readable. */}
              {alert && <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-pulse bg-red-100 motion-reduce:animate-none" />}
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${alert ? 'text-red-800' : 'text-slate-700'}`}>{pageLabel(key)}</span>
                  {alert && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-600 motion-reduce:animate-none" />}
                </div>
                {/* One number over the total: the page's open leads (pending + followed up) / all its
                    leads. The split is spelled out underneath. */}
                <div className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className={`text-2xl font-bold ${pending ? 'text-red-700' : followed ? 'text-emerald-700' : 'text-slate-300'}`}>
                    {leads ? pending + followed : '–'}
                  </span>
                  <span className="text-lg font-semibold text-slate-400">/</span>
                  <span className={`text-2xl font-bold ${total ? 'text-slate-900' : 'text-slate-300'}`}>{leads ? total : '–'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] font-medium">
                  <span className={pending ? 'text-red-700' : 'text-slate-400'}>{pending} pending</span>
                  <span className="text-slate-300">·</span>
                  <span className={followed ? 'text-emerald-700' : 'text-slate-400'}>{followed} followed up</span>
                </div>
              </div>
            </button>
          );
        })}
        {/* Lead Status: all pages together, by status — "count / all leads" for each of the four.
            Clicking it clears any page card and lists every assigned lead, finished ones included. */}
        <button
          type="button"
          onClick={() => setFilter('')}
          aria-pressed={!filter}
          aria-label={`Lead Status: ${statusCounts.map((r) => `${r.count} ${r.label}`).join(', ')} of ${leads ? leads.length : 0} leads. Show all leads`}
          className={`w-[14rem] shrink-0 snap-start cursor-pointer rounded-xl border bg-white p-3.5 text-left transition-colors hover:border-indigo-300 sm:w-auto sm:p-4 ${!filter ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Lead Status</span>
            <span className="whitespace-nowrap text-[11px] text-slate-400">{leads ? leads.length : '–'} total</span>
          </div>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
            {statusCounts.map((r) => {
              const row = STATUS_ROW[r.value];
              return (
                <li key={r.value} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="whitespace-nowrap font-semibold">
                    <span className={r.count ? row.text : 'text-slate-300'}>{leads ? r.count : '–'}</span>
                    <span className="text-slate-400"> / {leads ? leads.length : '–'}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
          <h3 className="m-0 text-base font-bold text-slate-900">{tableTitle}</h3>
            <p className="m-0 mt-0.5 text-xs text-slate-500">Click a lead to see everything they submitted and add a follow-up.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              Lead Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`h-9 cursor-pointer rounded-lg border bg-white px-3 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none ${statusFilter ? 'border-indigo-400' : 'border-slate-300'}`}
              >
                <option value="">All statuses</option>
                {ASSIGNMENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{STATUS_ROW[o.value].filter}</option>)}
              </select>
            </label>
            {(filter || statusFilter) && (
              <button
                type="button"
                onClick={() => { setFilter(''); setStatusFilter(''); }}
                className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Show all
              </button>
            )}
          </div>
        </div>

        {leads === null ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading your leads…</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-red-700">{error}</p>
        ) : unlinked ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Your account isn&apos;t linked to an HR employee record, so no leads can be assigned to you. Ask HR to link it.
          </p>
        ) : shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {statusFilter
              ? `No ${STATUS_ROW[statusFilter].filter.toLowerCase()} leads${filter ? ` from ${filterLabel}` : ''}.`
              : filter ? `No open ${filterLabel} leads — everything here is confirmed or marked not interested.` : 'No leads are assigned to you yet.'}
          </p>
        ) : (
          <>
          {/* Phones: one tappable card per lead. */}
          <ul className="m-0 list-none divide-y divide-slate-100 p-0 md:hidden">
            {shown.map((l) => (
              <li key={keyOf(l)}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; setOpenKey(keyOf(l)); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(keyOf(l)); } }}
                  aria-label={`Open lead ${l.name}`}
                  className="flex cursor-pointer gap-3 px-4 py-4 active:bg-indigo-50/60"
                >
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {initials(l.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{l.name || '—'}</div>
                        <div className="truncate text-xs text-slate-500">{l.company || 'No company given'}</div>
                      </div>
                      <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${assignmentStatusChipClass(l.status)}`}>
                        {assignmentStatusLabel(l.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">{pageLabel(pageKey(l))}</span>
                      <span className="text-slate-400">Arrived {formatDay(l.leadDate)}</span>
                      {(l.city || l.country) && <span className="text-slate-400">· {[l.city, l.country].filter(Boolean).join(', ')}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {l.contact && (
                        <a href={`tel:${l.contact.replace(/\s+/g, '')}`} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 no-underline">
                          Call {l.contact}
                        </a>
                      )}
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="inline-flex min-h-9 max-w-full items-center truncate rounded-lg border border-slate-200 px-3 text-xs font-semibold text-indigo-600 no-underline">
                          Email
                        </a>
                      )}
                      <span className="text-xs text-slate-400">
                        {l.followUpCount ? `${l.followUpCount} follow-up${l.followUpCount === 1 ? '' : 's'}` : 'No follow-ups yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="whitespace-nowrap px-5 py-3 font-semibold">Lead</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Page</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Contact</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Location</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Assigned</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Follow-ups</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
                  <th className="w-10 px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr
                    key={keyOf(l)}
                    tabIndex={0}
                    onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; setOpenKey(keyOf(l)); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(keyOf(l)); } }}
                    aria-label={`Open lead ${l.name}`}
                    className="group cursor-pointer border-t border-slate-100 align-middle transition-colors hover:bg-indigo-50/60 focus:bg-indigo-50/60 focus:outline-none"
                  >
                    {/* Lead: initials, name, company. The page's own "… form submission." query
                        text is left to the lead window — it repeated the Page column on every row. */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {initials(l.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="max-w-[200px] truncate font-semibold text-slate-900" title={l.name}>{l.name || '—'}</div>
                          <div className="max-w-[200px] truncate text-xs text-slate-500" title={l.company}>{l.company || 'No company given'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {pageLabel(pageKey(l))}
                      </span>
                      <div className="mt-1 whitespace-nowrap text-xs text-slate-400">Arrived {formatDay(l.leadDate)}</div>
                    </td>
                    <td className="px-4 py-4">
                      {l.contact
                        ? <a href={`tel:${l.contact.replace(/\s+/g, '')}`} className="block whitespace-nowrap text-slate-800 no-underline hover:text-indigo-600">{l.contact}</a>
                        : <span className="text-slate-400">—</span>}
                      {l.email && (
                        <a href={`mailto:${l.email}`} title={l.email} className="block max-w-[210px] truncate text-xs text-indigo-600 no-underline hover:text-indigo-800">
                          {l.email}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {l.city || l.country ? (
                        <>
                          <div className="whitespace-nowrap text-slate-800">{l.city || '—'}</div>
                          {l.country && <div className="whitespace-nowrap text-xs text-slate-500">{l.country}</div>}
                        </>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="whitespace-nowrap text-slate-800">{formatDay(l.assignedAt)}</div>
                      {l.assignedBy && <div className="whitespace-nowrap text-xs text-slate-400">by {l.assignedBy}</div>}
                    </td>
                    <td className="px-4 py-4">
                      {l.followUpCount ? (
                        <>
                          <span className="inline-block whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {l.followUpCount} follow-up{l.followUpCount === 1 ? '' : 's'}
                          </span>
                          <div className="mt-1 whitespace-nowrap text-xs text-slate-400">Last {formatDay(l.lastFollowUpAt)}</div>
                        </>
                      ) : <span className="whitespace-nowrap text-xs text-slate-400">None yet</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${assignmentStatusChipClass(l.status)}`}>
                        {assignmentStatusLabel(l.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        ›
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {openLead && (
        <LeadDetailDrawer
          key={openKey}
          lead={openLead}
          endpoint={endpoint}
          getHeaders={getHeaders}
          onClose={() => setOpenKey(null)}
          onChanged={applyDetail}
        />
      )}
    </div>
  );
}
