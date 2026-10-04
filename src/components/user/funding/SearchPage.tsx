'use client';

import { useEffect, useState } from 'react';
import type { FundingFilterOptions } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { fundingGet, toQuery } from './api';
import PageTopbar from './PageTopbar';
import { cardCls, inputCls, labelCls, pillCls, tdCls, thCls } from './ui';

interface SearchRow {
  id: number;
  startupName: string;
  sector: string;
  roundStage: string;
  amount: number | null;
  city: string;
  country: string;
  leadInvestor: string;
}

type ChipKey = 'sector' | 'city' | 'country' | 'stage' | 'investor';

/** /dashboard/funding/search — preview "Search": search box, filter chips, results (first 50 shown). */
export default function SearchPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<Record<ChipKey, string>>({ sector: '', city: '', country: '', stage: '', investor: '' });
  const [options, setOptions] = useState<FundingFilterOptions>({ sectors: [], stages: [], cities: [], countries: [] });
  const [rows, setRows] = useState<SearchRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fundingGet('/api/funding/filters').then((j) => setOptions(j.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    fundingGet(`/api/funding/search?${toQuery({ search: query, ...chips })}`)
      .then((j) => { if (!cancelled) { setRows(j.data); setTotal(j.total); setError(null); } })
      .catch((e: Error) => { if (!cancelled) { setRows([]); setError(e.message); } });
    return () => { cancelled = true; };
  }, [query, chips]);

  const chip = (key: ChipKey, label: string, values: string[]) => {
    const active = Boolean(chips[key]);
    return (
      <label className={`relative flex cursor-pointer items-center gap-[5px] rounded-[9px] border border-solid px-[13px] py-[7px] text-[12.5px] font-semibold ${active ? 'border-fi-ink bg-fi-ink text-white' : 'border-fi-line bg-fi-surface text-fi-ink-soft'}`}>
        {chips[key] || label} ▾
        <select
          aria-label={label}
          className="absolute inset-0 cursor-pointer opacity-0"
          value={chips[key]}
          onChange={(e) => setChips((c) => ({ ...c, [key]: e.target.value }))}
        >
          <option value="">All — {label}</option>
          {values.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
    );
  };

  return (
    <div>
      <PageTopbar title="Search" sub="Every deal in the dataset, searchable" />
      <div className="pt-[22px]">
        <div className={`${cardCls} flex flex-wrap items-end gap-2.5 px-4 py-3.5`}>
          <div className="flex flex-[1_1_180px] flex-col gap-1">
            <label className={labelCls} htmlFor="fs-q">Search</label>
            <input id="fs-q" type="text" className={inputCls} placeholder="Search startups, sectors, investors…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="my-4 flex flex-wrap gap-2">
          {chip('sector', 'Sector', options.sectors)}
          {chip('city', 'City', options.cities)}
          {chip('country', 'Country', options.countries)}
          {chip('stage', 'Funding stage', options.stages)}
          <label className={`flex items-center gap-[5px] rounded-[9px] border border-solid px-[13px] py-[3px] text-[12.5px] font-semibold ${chips.investor ? 'border-fi-ink' : 'border-fi-line'} bg-fi-surface text-fi-ink-soft`}>
            Investor
            <input
              type="text"
              aria-label="Investor"
              placeholder="any"
              className="box-border w-28 border-0 bg-transparent py-1 text-[12.5px] text-fi-ink outline-none"
              value={chips.investor}
              onChange={(e) => setChips((c) => ({ ...c, investor: e.target.value }))}
            />
          </label>
        </div>
        {error && <p className="m-0 mb-4 rounded-[10px] border border-solid border-[#F5C2C9] bg-fi-red-light px-3 py-2.5 text-[12.5px] text-fi-red">{error}</p>}
        <div className={`${cardCls} mt-4 overflow-hidden`}>
          <div className="flex items-center justify-between gap-2.5 border-0 border-b border-solid border-fi-line px-4 py-3.5">
            <span className="text-[12px] text-fi-ink-faint">
              {rows ? `${total.toLocaleString()} results${total > rows.length ? ` (showing first ${rows.length})` : ''}` : 'Searching…'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-[12.5px]">
              <thead><tr>{['Name', 'Sector', 'Stage', 'Amount', 'City', 'Country', 'Lead investor'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {rows && rows.length === 0 && <tr><td colSpan={7} className="px-3.5 py-5 text-center text-fi-ink-faint">No matches</td></tr>}
                {rows?.map((r) => (
                  <tr key={r.id} className="hover:bg-fi-bg">
                    <td className={tdCls}><b>{r.startupName}</b></td>
                    <td className={tdCls}>{r.sector || '—'}</td>
                    <td className={tdCls}>{r.roundStage ? <span className={pillCls}>{r.roundStage}</span> : '—'}</td>
                    <td className={`${tdCls} whitespace-nowrap font-(family-name:--font-fi-plex) font-medium`}>{formatUsdMn(r.amount)}</td>
                    <td className={tdCls}>{r.city || '—'}</td>
                    <td className={tdCls}>{r.country || '—'}</td>
                    <td className={tdCls}>{r.leadInvestor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
