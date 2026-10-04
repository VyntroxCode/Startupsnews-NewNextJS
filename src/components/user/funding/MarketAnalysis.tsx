'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MarketMeta } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import CumulativeTab from './market/CumulativeTab';
import GrowthTab from './market/GrowthTab';
import HeadToHeadTab from './market/HeadToHeadTab';
import LocationTab from './market/LocationTab';
import OverviewTab from './market/OverviewTab';
import { MaCard } from './market/shared';
import TimeSeriesTab from './market/TimeSeriesTab';
import PageTopbar from './PageTopbar';
import { cardCls, emptyCls } from './ui';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeseries', label: 'Time series' },
  { key: 'location', label: 'By location' },
  { key: 'growth', label: 'By growth' },
  { key: 'cumulative', label: 'Cumulative race' },
  { key: 'h2h', label: 'Head to head' },
  { key: 'investors', label: 'Investors' },
  { key: 'operating', label: 'Operating' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** /dashboard/funding/market — preview "Market Analysis": 12-month KPI strip + eight subtabs (lazy). */
export default function MarketAnalysis() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const onMeta = useCallback((m: MarketMeta) => setMeta(m), []);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Keep the chosen subtab visible when the row scrolls sideways on small screens.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);
  const countries = meta?.countries ?? [];

  const kpis = [
    { lbl: 'Capital in view', val: meta ? formatUsdMn(meta.kpis.capital) : '$0', sub: 'Last 12 months' },
    { lbl: 'Rounds', val: meta ? meta.kpis.rounds.toLocaleString() : '0', sub: 'Closed deals in this window' },
    { lbl: 'Mean check', val: meta ? formatUsdMn(meta.kpis.meanCheck) : '$0', sub: 'Total raised ÷ round count' },
  ];

  return (
    <div>
      <PageTopbar title="Market Analysis" sub="Benchmarking across the whole funding dataset" />
      <div className="pt-[22px]">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
          {kpis.map((k) => (
            <div key={k.lbl} className={`${cardCls} min-w-0 px-4 py-3.5 sm:p-[18px]`}>
              <div className="text-[12px] text-fi-ink-soft sm:text-[12.5px]">{k.lbl}</div>
              <div className="mb-[3px] mt-1 truncate font-(family-name:--font-fi-space) text-[21px] font-bold leading-tight text-fi-ink sm:mt-1.5 sm:text-[24px] lg:text-[26px]">{k.val}</div>
              <div className="text-[11px] text-fi-ink-faint">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="mb-3.5 mt-4 box-border flex w-full max-w-full gap-1 overflow-x-auto rounded-[10px] border border-solid border-fi-line bg-fi-bg p-1 [scrollbar-width:none] sm:mt-[18px] lg:w-fit [&::-webkit-scrollbar]:hidden" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              ref={tab === t.key ? activeTabRef : undefined}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-[7px] border-0 px-3 py-2 text-[12px] sm:px-4 sm:text-[12.5px] font-semibold font-(family-name:--font-db-inter) ${tab === t.key ? 'bg-fi-surface text-fi-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'bg-transparent text-fi-ink-soft'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab onMeta={onMeta} />}
        {tab === 'timeseries' && <TimeSeriesTab onMeta={onMeta} countries={countries} />}
        {tab === 'location' && <LocationTab onMeta={onMeta} countries={countries} />}
        {tab === 'growth' && <GrowthTab onMeta={onMeta} years={meta?.years ?? []} />}
        {tab === 'cumulative' && <CumulativeTab onMeta={onMeta} countries={countries} />}
        {tab === 'h2h' && <HeadToHeadTab onMeta={onMeta} countries={countries} />}
        {tab === 'investors' && (
          <MaCard title="Investors" desc="Investor leaderboard, portfolios, and comparisons.">
            <div className={emptyCls}>Coming soon. Until then, Top investors on the Dashboard ranks investors for any filter.</div>
          </MaCard>
        )}
        {tab === 'operating' && (
          <MaCard title="Operating" desc="Headcount, revenue signals, and growth metrics — needs data most sources don't disclose publicly.">
            <div className={emptyCls}>Would need a paid data partnership (similar to Dealroom/Crunchbase&apos;s own sourcing) — not achievable from funding-round data alone.</div>
          </MaCard>
        )}
      </div>
    </div>
  );
}
