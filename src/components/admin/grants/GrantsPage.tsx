'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';
import { getAuthHeaders } from '@/lib/admin-auth';
import {
  DOSSIER_STATUSES,
  type DossierDetail,
  type DossierListItem,
  type DossierStatus,
  type DossierStatusCounts,
} from '@/modules/incubatx-dossier/domain/types';
import GrantDetailDrawer from './GrantDetailDrawer';
import { GRANT_STATUS_META, formatSubmitted, initials } from './constants';

const EMPTY_COUNTS: DossierStatusCounts = { total: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0 };

/** /admin/grants — every IncubatX startup dossier submitted on /incubatx/startup-details. The table
 * keeps to the few columns needed to scan the queue; clicking a row opens the full dossier. */
export default function GrantsPage() {
  const [rows, setRows] = useState<DossierListItem[] | null>(null);
  const [counts, setCounts] = useState<DossierStatusCounts>(EMPTY_COUNTS);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<DossierStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState<DossierListItem | null>(null);

  // Search waits for the admin to stop typing, then starts again from page 1.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set('search', search);
      if (status) qs.set('status', status);
      const res = await fetch(`/api/admin/grants?${qs}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load grant submissions');
      setRows(json.data);
      setCounts(json.counts);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grant submissions');
      setRows([]);
    }
  }, [page, limit, search, status]);

  useEffect(() => { void load(); }, [load]);

  function pickStatus(next: DossierStatus | '') {
    setStatus(next);
    setPage(1);
  }

  /** A status saved in the drawer: patch the row in place and refresh the counts, without losing
   * the admin's page, search or filter. */
  function applyDetail(detail: DossierDetail) {
    setRows((prev) => prev?.map((r) => (r.id === detail.id ? { ...r, status: detail.status } : r)) ?? prev);
    void load();
  }

  const cards: { value: DossierStatus | ''; label: string; count: number; dot: string; text: string }[] = [
    { value: '', label: 'All submissions', count: counts.total, dot: 'bg-indigo-500', text: 'text-slate-900' },
    ...DOSSIER_STATUSES.map((s) => ({ value: s, label: GRANT_STATUS_META[s].label, count: counts[s], dot: GRANT_STATUS_META[s].dot, text: GRANT_STATUS_META[s].text })),
  ];

  return (
    <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-5 pb-10">
      <div>
        <h1 className="m-0 text-2xl font-bold text-slate-900">Grants</h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Startup dossiers submitted on the IncubatX Startup Details form. Click a row to see the full submission and documents.
        </p>
      </div>

      {/* Status cards double as the status filter. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const active = status === c.value;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => pickStatus(c.value)}
              aria-pressed={active}
              className={`cursor-pointer rounded-xl border bg-white p-4 text-left transition-colors hover:border-indigo-300 ${active ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                {c.label}
              </span>
              <span className={`mt-2 block text-2xl font-bold ${c.count ? c.text : 'text-slate-300'}`}>{rows ? c.count : '–'}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h2 className="m-0 text-base font-bold text-slate-900">
              {status ? `${GRANT_STATUS_META[status].label} submissions` : 'All submissions'}
            </h2>
            <p className="m-0 mt-0.5 text-xs text-slate-500">{rows ? `${total} ${total === 1 ? 'submission' : 'submissions'}` : 'Loading…'}</p>
          </div>
          <label className="relative flex w-full items-center sm:w-80">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-slate-400" />
            <span className="sr-only">Search submissions</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search startup, email, founder, reference…"
              className="box-border h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </label>
        </div>

        {rows === null ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading submissions…</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-red-700">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {search || status ? 'No submissions match these filters.' : 'No startup has submitted the IncubatX form yet.'}
          </p>
        ) : (
          <>
            {/* Phones: one tappable card per submission. */}
            <ul className="m-0 list-none divide-y divide-slate-100 p-0 md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    className="flex w-full cursor-pointer gap-3 border-0 bg-transparent px-4 py-4 text-left active:bg-indigo-50/60"
                  >
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {initials(r.startupName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900">{r.startupName}</span>
                          <span className="block truncate text-xs text-slate-500">{r.email}</span>
                        </span>
                        <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${GRANT_STATUS_META[r.status].chip}`}>
                          {GRANT_STATUS_META[r.status].label}
                        </span>
                      </span>
                      <span className="mt-2 block text-xs text-slate-400">
                        {r.stage} · {r.sector} · {formatSubmitted(r.submittedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Desktop: table. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Startup</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Stage / Sector</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Contact</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Submitted</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
                    <th className="w-10 px-4 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; setOpen(r); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(r); } }}
                      aria-label={`Open ${r.startupName}`}
                      className="group cursor-pointer border-t border-slate-100 align-middle transition-colors hover:bg-indigo-50/60 focus:bg-indigo-50/60 focus:outline-none"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {initials(r.startupName)}
                          </span>
                          <div className="min-w-0">
                            <div className="max-w-[240px] truncate font-semibold text-slate-900" title={r.startupName}>{r.startupName}</div>
                            <div className="font-mono text-xs text-slate-400">{r.reference || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{r.stage}</span>
                        <div className="mt-1 max-w-[180px] truncate text-xs text-slate-500" title={r.sector}>{r.sector}</div>
                      </td>
                      <td className="px-4 py-4">
                        <a href={`mailto:${r.email}`} title={r.email} className="block max-w-[220px] truncate text-indigo-600 no-underline hover:text-indigo-800">{r.email}</a>
                        {r.mobile && <div className="whitespace-nowrap text-xs text-slate-500">{r.mobile}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatSubmitted(r.submittedAt)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${GRANT_STATUS_META[r.status].chip}`}>
                          {GRANT_STATUS_META[r.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                          <ChevronRight size={18} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  limit={limit}
                  total={total}
                  onLimitChange={(l) => { setLimit(l); setPage(1); }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {open && (
        <GrantDetailDrawer
          key={open.id}
          item={open}
          onClose={() => setOpen(null)}
          onStatusChanged={applyDetail}
        />
      )}
    </div>
  );
}
