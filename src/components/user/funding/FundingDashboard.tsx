'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FundingFilterOptions, FundingOverview, TrendRange } from '@/modules/funding-deals/domain/types';
import { emptyFilters, fundingGet, toQuery } from './api';
import BarList from './BarList';
import FilterBar, { type ReaderFilters } from './FilterBar';
import InvestorTable from './InvestorTable';
import KpiGrid from './KpiGrid';
import OutlookCards from './OutlookCards';
import PageTopbar from './PageTopbar';
import PinnedOverview from './PinnedOverview';
import SponsoredStrip from './SponsoredStrip';
import Ticker from './Ticker';
import { sectionHead, sectionSub, sectionTitle } from './ui';

/** Best-effort country from the browser time zone; the country tabs always override it. */
function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'India';
    if (tz.startsWith('America/') && !/Argentina|Sao_Paulo|Bogota|Lima|Santiago|Mexico|Toronto|Vancouver/.test(tz)) return 'USA';
  } catch {
    /* fall through */
  }
  return '';
}

/**
 * /dashboard/funding — the preview's Dashboard page. The country tabs and the filter-bar country are
 * one setting: picking India shows India in the overview card and everything below it.
 */
export default function FundingDashboard() {
  const [detected, setDetected] = useState('');
  const [filters, setFilters] = useState<ReaderFilters>(() => emptyFilters());
  const [applied, setApplied] = useState<ReaderFilters>(filters);
  const [range, setRange] = useState<TrendRange>('month');
  const [options, setOptions] = useState<FundingFilterOptions>({ sectors: [], stages: [], cities: [], countries: [] });
  const [overview, setOverview] = useState<FundingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => fundingGet('/api/funding/filters').then((j) => setOptions(j.data)).catch(() => {}), []);

  useEffect(() => {
    const country = detectCountry();
    if (country) {
      setDetected(country);
      const next = emptyFilters(country);
      setFilters(next);
      setApplied(next);
    }
    void load();
  }, [load]);

  // Debounce typing (search, investor); apply dropdown/date changes at once.
  useEffect(() => {
    const typing = filters.search !== applied.search || filters.investor !== applied.investor;
    const t = setTimeout(() => setApplied(filters), typing ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to edits
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    fundingGet(`/api/funding/overview?${toQuery({ ...applied, pinnedCountry: applied.country || 'all', range })}`)
      .then((j) => { if (!cancelled) { setOverview(j.data); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [applied, range]);

  const patch = (p: Partial<ReaderFilters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <div>
      <PageTopbar title="Dashboard" sub="Funding intelligence at a glance" />
      <div className="pt-[22px]">
        <SponsoredStrip />
        <Ticker />

        {error && <p className="m-0 mt-4 rounded-[10px] border border-solid border-[#F5C2C9] bg-fi-red-light px-3 py-2.5 text-[12.5px] text-fi-red">{error}</p>}

        <PinnedOverview
          pinned={overview?.pinned ?? null}
          country={filters.country}
          detectedCountry={detected && filters.country === detected ? detected : ''}
          onCountry={(country) => patch({ country })}
          range={range}
          onRange={setRange}
        />

        <div className="mt-5">
          <FilterBar filters={filters} options={options} onChange={patch} onReset={() => setFilters(emptyFilters(filters.country))} />
        </div>

        <div className={sectionHead}>
          <h2 className={sectionTitle}>Funding in view</h2>
          <span className={sectionSub}>Reacts to filters above · defaults to current calendar year</span>
        </div>
        {overview ? <KpiGrid kpis={overview.kpis} /> : <div className="mt-4 h-[104px] animate-pulse rounded-[14px] bg-fi-surface" />}

        <div className={sectionHead}>
          <h2 className={sectionTitle}>Where the money&apos;s going</h2>
          <span className={sectionSub}>Every chart shows both deal count and $ amount</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <BarList title="By sector" rows={overview?.bySector ?? []} />
          <BarList title="By round stage" rows={overview?.byStage ?? []} />
          <BarList title="By city" rows={overview?.byCity ?? []} />
          <InvestorTable rows={overview?.topInvestors ?? []} />
        </div>

        <div className={sectionHead}>
          <h2 className={sectionTitle}>12-month outlook</h2>
          <span className={sectionSub}>Directional forecast, not investment advice</span>
        </div>
        <OutlookCards forecast={overview?.forecast ?? null} signals={overview?.signals ?? []} />
      </div>
    </div>
  );
}
