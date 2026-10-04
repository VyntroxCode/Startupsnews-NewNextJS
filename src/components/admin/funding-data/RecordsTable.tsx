'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Pencil, Search, Trash2, X } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';
import { getAuthHeaders } from '@/lib/admin-auth';
import type { FundingDeal, FundingDealInput, FundingFilterOptions } from '@/modules/funding-deals/domain/types';
import { formatDealDate, formatUsdMn } from '@/modules/funding-deals/utils/format';
import { downloadWithHeaders } from '@/modules/funding-deals/utils/download';
import DealForm from './DealForm';
import { btnGhost, btnGhostDanger, btnSecondary, cardCls, inputCls, labelCls, stagePill } from './ui';

interface Filters {
  search: string;
  sector: string;
  stage: string;
  country: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { search: '', sector: '', stage: '', country: '', from: '', to: '' };

function toQuery(filters: Filters, extra: Record<string, string | number> = {}): string {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
  Object.entries(extra).forEach(([k, v]) => qs.set(k, String(v)));
  return qs.toString();
}

function dealToInput(d: FundingDeal): Required<FundingDealInput> {
  return {
    date: d.date,
    startupName: d.startupName,
    sector: d.sector,
    businessModel: d.businessModel,
    roundStage: d.roundStage,
    amountRaw: d.amountRaw,
    city: d.city,
    country: d.country,
    leadInvestor: d.leadInvestor,
    investors: d.investors,
    sourceUrl: d.sourceUrl,
  };
}

/** Admin › Funding Data › Manage Records — search, filter, edit, delete and export deals. */
export default function RecordsTable({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [deals, setDeals] = useState<FundingDeal[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [options, setOptions] = useState<FundingFilterOptions>({ sectors: [], stages: [], cities: [], countries: [] });
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FundingDeal | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchDraft.trim() ? f : { ...f, search: searchDraft.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/funding-deals?${toQuery(filters, { page, limit })}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load deals.');
      setDeals(json.data);
      setOptions(json.options);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deals.');
      setDeals([]);
    }
  }, [filters, page, limit]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const setFilter = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const handleDelete = async (deal: FundingDeal) => {
    if (!window.confirm(`Delete ${deal.startupName} (${deal.roundStage || 'round'}, ${formatDealDate(deal.date)})? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/funding-deals/${deal.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    const json = await res.json().catch(() => ({ success: false }));
    if (!json.success) { window.alert(json.error || 'Delete failed.'); return; }
    onChanged();
    void load();
  };

  const handleEdit = async (values: Required<FundingDealInput>): Promise<string | null> => {
    if (!editing) return null;
    const res = await fetch(`/api/admin/funding-deals/${editing.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({ success: false }));
    if (!json.success) return json.error || 'Update failed.';
    setEditing(null);
    onChanged();
    void load();
    return null;
  };

  const handleExport = async () => {
    setExporting(true);
    const err = await downloadWithHeaders(`/api/admin/funding-deals/export?${toQuery(filters)}`, getAuthHeaders(), 'funding-deals.xlsx');
    setExporting(false);
    if (err) window.alert(err);
  };

  const hasFilters = Object.values(filters).some(Boolean) || searchDraft;

  return (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="flex flex-col gap-4 border-0 border-b border-solid border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-slate-900">All records</h2>
            <p className="m-0 mt-0.5 text-xs text-slate-500">{deals ? `${total.toLocaleString()} ${total === 1 ? 'deal' : 'deals'}` : 'Loading…'}</p>
          </div>
          <button type="button" className={btnSecondary} onClick={handleExport} disabled={exporting || !total}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export filtered (.xlsx)
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="sm:col-span-3 lg:col-span-2">
            <label className={labelCls} htmlFor="fr-search">Search</label>
            <div className="relative flex items-center">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-slate-400" />
              <input id="fr-search" type="search" placeholder="Startup, sector or investor" className={`${inputCls} pl-9`} value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="fr-sector">Sector</label>
            <select id="fr-sector" className={inputCls} value={filters.sector} onChange={setFilter('sector')}>
              <option value="">All sectors</option>
              {options.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="fr-stage">Stage</label>
            <select id="fr-stage" className={inputCls} value={filters.stage} onChange={setFilter('stage')}>
              <option value="">All stages</option>
              {options.stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="fr-country">Country</label>
            <select id="fr-country" className={inputCls} value={filters.country} onChange={setFilter('country')}>
              <option value="">All countries</option>
              {options.countries.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor="fr-from">From</label>
              <input id="fr-from" type="date" className={`${inputCls} px-2`} value={filters.from} onChange={setFilter('from')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="fr-to">To</label>
              <input id="fr-to" type="date" className={`${inputCls} px-2`} value={filters.to} onChange={setFilter('to')} />
            </div>
          </div>
        </div>
        {hasFilters && (
          <button type="button" className="w-fit cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-[#E01552] hover:underline" onClick={() => { setFilters(EMPTY_FILTERS); setSearchDraft(''); setPage(1); }}>
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="m-0 px-5 py-3 text-sm text-red-700">{error}</p>}

      {!deals ? (
        <p className="m-0 px-5 py-10 text-center text-sm text-slate-500">Loading deals…</p>
      ) : deals.length === 0 ? (
        <p className="m-0 px-5 py-10 text-center text-sm text-slate-500">
          {hasFilters ? 'No deals match these filters.' : 'No deals yet — add one manually or upload an Excel file.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-5 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Startup</th>
                <th className="px-4 py-3 font-semibold">Sector</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">Lead investor</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="w-20 px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-0 border-t border-solid border-slate-100 align-middle hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600">{formatDealDate(d.date)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{d.startupName}</td>
                  <td className="px-4 py-3 text-slate-700">{d.sector || '—'}</td>
                  <td className="px-4 py-3">{d.roundStage ? <span className={stagePill}>{d.roundStage}</span> : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-800" title={d.amountRaw}>{formatUsdMn(d.amount)}</td>
                  <td className="px-4 py-3 text-slate-700">{d.city || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{d.country || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{d.leadInvestor || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.batchId ? `Upload #${d.batchId}` : 'Manual'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button type="button" className={btnGhost} aria-label={`Edit ${d.startupName}`} onClick={() => setEditing(d)}><Pencil size={15} /></button>
                    <button type="button" className={btnGhostDanger} aria-label={`Delete ${d.startupName}`} onClick={() => void handleDelete(d)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deals && total > 0 && (
        <div className="border-0 border-t border-solid border-slate-200 px-5 py-3">
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-10" role="dialog" aria-modal="true" aria-label={`Edit ${editing.startupName}`}>
          <div className="box-border w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-lg font-bold text-slate-900">Edit deal</h3>
              <button type="button" className={btnGhost} aria-label="Close" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <DealForm initial={dealToInput(editing)} submitLabel="Save changes" onSubmit={handleEdit} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
