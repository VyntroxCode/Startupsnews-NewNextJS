'use client';

import type { FundingFilterOptions } from '@/modules/funding-deals/domain/types';
import { btnGhost, cardCls, inputCls, labelCls } from './ui';

export interface ReaderFilters {
  search: string;
  sector: string;
  stage: string;
  city: string;
  country: string;
  investor: string;
  from: string;
  to: string;
}

type FilterKey = keyof ReaderFilters;

const group = 'flex min-w-[130px] flex-[1_1_130px] flex-col gap-1';

/**
 * Preview .filter-bar. `fields` picks which controls show (the Dashboard shows all; All Deals shows
 * search, sector, country, from, to).
 */
export default function FilterBar({
  filters,
  options,
  onChange,
  onReset,
  fields = ['search', 'sector', 'stage', 'city', 'country', 'investor', 'from', 'to'],
}: {
  filters: ReaderFilters;
  options: FundingFilterOptions;
  onChange: (patch: Partial<ReaderFilters>) => void;
  onReset: () => void;
  fields?: FilterKey[];
}) {
  const show = (k: FilterKey) => fields.includes(k);
  const select = (key: 'sector' | 'stage' | 'city' | 'country', label: string, all: string, values: string[]) => (
    <div className={group}>
      <label className={labelCls} htmlFor={`ff-${key}`}>{label}</label>
      <select id={`ff-${key}`} className={inputCls} value={filters[key]} onChange={(e) => onChange({ [key]: e.target.value })}>
        <option value="">{all}</option>
        {filters[key] && !values.includes(filters[key]) && <option value={filters[key]}>{filters[key]}</option>}
        {values.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );

  return (
    <div className={`${cardCls} flex flex-wrap items-end gap-2.5 px-4 py-3.5`}>
      {show('search') && (
        <div className={`${group} flex-[1_1_180px]`}>
          <label className={labelCls} htmlFor="ff-search">Search startup</label>
          <input id="ff-search" type="text" placeholder="e.g. Yulu, BlissClub…" className={inputCls} value={filters.search} onChange={(e) => onChange({ search: e.target.value })} />
        </div>
      )}
      {show('sector') && select('sector', 'Sector', 'All sectors', options.sectors)}
      {show('stage') && select('stage', 'Round stage', 'All stages', options.stages)}
      {show('city') && select('city', 'City', 'All cities', options.cities)}
      {show('country') && select('country', 'Country', 'All countries', options.countries)}
      {show('investor') && (
        <div className={group}>
          <label className={labelCls} htmlFor="ff-investor">Investor</label>
          <input id="ff-investor" type="text" placeholder="e.g. Lightspeed" className={inputCls} value={filters.investor} onChange={(e) => onChange({ investor: e.target.value })} />
        </div>
      )}
      {show('from') && (
        <div className={group}>
          <label className={labelCls} htmlFor="ff-from">From</label>
          <input id="ff-from" type="date" className={inputCls} value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
        </div>
      )}
      {show('to') && (
        <div className={group}>
          <label className={labelCls} htmlFor="ff-to">To</label>
          <input id="ff-to" type="date" className={inputCls} value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
        </div>
      )}
      <button type="button" className={btnGhost} onClick={onReset}>Reset to this year</button>
    </div>
  );
}
