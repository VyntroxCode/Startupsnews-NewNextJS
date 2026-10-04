'use client';

import type { FundingOverview, TrendRange } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import TrendComboChart from './charts/TrendComboChart';
import { segBtn, segWrap } from './ui';

export const COUNTRY_TABS = [
  { value: '', label: '🌍 All countries' },
  { value: 'India', label: '🇮🇳 India' },
  { value: 'USA', label: '🇺🇸 USA' },
];

const RANGES: { value: TrendRange; label: string }[] = [
  { value: 'week', label: 'Week on week' },
  { value: 'month', label: 'Month on month' },
  { value: 'year', label: 'Year on year' },
];

interface PinnedOverviewProps {
  pinned: FundingOverview['pinned'] | null;
  country: string;
  detectedCountry: string;
  onCountry: (country: string) => void;
  range: TrendRange;
  onRange: (range: TrendRange) => void;
}

/** Preview .pinned-overview — "{year} Funding Overview", current calendar year, country tabs only. */
export default function PinnedOverview({ pinned, country, detectedCountry, onCountry, range, onRange }: PinnedOverviewProps) {
  const year = pinned?.year ?? new Date().getFullYear();
  return (
    <div className="mt-4 rounded-[18px] border border-solid border-fi-line bg-fi-surface px-6 py-[22px] shadow-fi">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-[5px] rounded-[20px] border border-solid border-[#F6C9D6] bg-fi-primary-light px-[9px] py-[3px] text-[10.5px] font-bold tracking-[0.03em] text-fi-primary-dark">
            ✦ Funding intelligence
          </div>
          <h2 className="m-0 mb-1 font-(family-name:--font-fi-space) text-[19px] font-bold tracking-[-0.01em] text-fi-ink">{year} Funding Overview</h2>
          <div className="text-[11.5px] text-fi-ink-faint">Jan 1 – today, {year} · full dataset, unaffected by filters below</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fi-ink-faint">
            📍 {detectedCountry ? <>Auto-detected: <b className="text-fi-ink-soft">{detectedCountry}</b> (best-effort, from your time zone) — not you? change below</> : 'Showing all countries — pick India or USA below'}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-fi-ink-faint">Total funding tracked</div>
          <div className="mt-0.5 font-(family-name:--font-fi-space) text-[28px] font-bold tracking-[-0.01em] text-fi-ink">{pinned ? formatUsdMn(pinned.total) : '$0'}</div>
          <div className="mt-0.5 text-[11.5px] text-fi-ink-faint">{pinned ? `${pinned.deals} deals this year` : '0 deals'}</div>
        </div>
      </div>

      <div className="mb-4 mt-1.5 flex flex-wrap gap-2" role="tablist" aria-label="Country">
        {COUNTRY_TABS.map((t) => {
          const active = country === t.value;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCountry(t.value)}
              className={`cursor-pointer rounded-[20px] border border-solid px-[15px] py-[7px] text-[12.5px] font-semibold font-(family-name:--font-db-inter) ${active ? 'border-fi-ink bg-fi-ink text-white' : 'border-fi-line bg-fi-surface text-fi-ink-soft'}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className={`${segWrap} mb-3.5`}>
        {RANGES.map((r) => (
          <button key={r.value} type="button" className={segBtn(range === r.value)} onClick={() => onRange(r.value)}>{r.label}</button>
        ))}
      </div>

      {pinned ? <TrendComboChart buckets={pinned.trend} /> : <div className="h-[320px] animate-pulse rounded-lg bg-fi-bg" />}
    </div>
  );
}
