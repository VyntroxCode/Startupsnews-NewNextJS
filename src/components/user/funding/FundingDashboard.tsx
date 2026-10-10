'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCw } from 'lucide-react';
import type { FundingOverview, TrendRange } from '@/modules/funding-deals/domain/types';
import { emptyFilters, fundingGet, toQuery } from './api';
import CitySection from './dashboard/CitySection';
import { HighlightProvider } from './dashboard/highlight';
import InvestorSection from './dashboard/InvestorSection';
import MoneyFlowSection from './dashboard/MoneyFlowSection';
import { useLoadingFade, usePageReveal } from './dashboard/motion';
import OverviewHero from './dashboard/OverviewHero';
import { Section, primaryCard } from './dashboard/parts';
import SectorSection from './dashboard/SectorSection';
import { buildDashboard } from './dashboard/selectors';
import StageSection from './dashboard/StageSection';
import TrendSection from './dashboard/TrendSection';
import type { ReaderFilters } from './FilterBar';
import OutlookCards from './OutlookCards';
import SponsoredStrip from './SponsoredStrip';
import { btnCls } from './ui';

/**
 * /dashboard/funding — funding intelligence for the current calendar year. The hero's country dropdown (India only for now) drives
 * everything below the hero; the week/month/year switch only regroups the trend chart.
 * All figures come from GET /api/funding/overview (server-side aggregation of funding_deals);
 * dashboard/selectors.ts only reshapes that response for the charts.
 */
export default function FundingDashboard() {
  const [filters, setFilters] = useState<ReaderFilters>(() => emptyFilters('India'));
  const [range, setRange] = useState<TrendRange>('month');
  const [overview, setOverview] = useState<FundingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the request in flight (dims the page)
    setLoading(true);
    fundingGet(`/api/funding/overview?${toQuery({ ...filters, pinnedCountry: filters.country || 'all', range })}`, ctrl.signal)
      .then((j) => { setOverview(j.data); setError(null); })
      .catch((e: Error) => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [filters, range, attempt]);

  const model = useMemo(() => (overview ? buildDashboard(overview) : null), [overview]);
  const ready = !!overview;
  const empty = !!overview && overview.kpis.totalDeals === 0;

  usePageReveal(pageRef, ready);
  useLoadingFade(bodyRef, loading && ready);

  const onCountry = (country: string) => setFilters((f) => ({ ...f, country }));
  const retry = () => setAttempt((n) => n + 1);

  const errorBox = error && (
    <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-solid border-[#F5C2C9] bg-fi-red-light px-3.5 py-2.5 text-[12.5px] text-fi-red">
      <span>{error}{overview ? ' Showing the last figures that loaded.' : ''}</span>
      <button type="button" className={btnCls} onClick={retry}><RotateCw size={13} aria-hidden /> Try again</button>
    </div>
  );

  const where = filters.country || 'Any Country';

  return (
    <div ref={pageRef}>
      <div>
        <SponsoredStrip />

        <HighlightProvider>
          <OverviewHero overview={overview} yoy={model?.yoy ?? null} country={filters.country} onCountry={onCountry} />
          {errorBox}

          {!error || overview ? (
            <div ref={bodyRef} aria-busy={loading}>
              {empty ? (
                <Section id="fi-empty" eyebrow="No Data Yet" title={`No Deals For ${where} In ${overview.pinned.year}`} sub="Nothing has been uploaded for this country this year. The charts will fill in as soon as deals are added in Admin › Funding Data.">
                  <div className={`${primaryCard} text-[12.5px] text-fi-ink-soft`}>There is no funding activity to chart for this selection.</div>
                </Section>
              ) : (
                <>
                  <TrendSection buckets={overview?.pinned.trend ?? null} range={range} onRange={setRange} />
                  <SectorSection rows={overview?.bySector ?? null} total={overview?.kpis.totalFunding ?? 0} model={model} />
                  <StageSection stages={overview?.byStage ?? null} bands={overview?.bySizeBand ?? null} />
                  <MoneyFlowSection model={model} totalDeals={overview?.kpis.totalDeals ?? 0} />
                  <CitySection rows={overview?.byCity ?? null} points={model?.cities ?? null} total={overview?.kpis.totalFunding ?? 0} />
                  <InvestorSection
                    investors={overview?.topInvestors ?? null}
                    companies={overview?.topCompanies ?? null}
                    models={overview?.byBusinessModel ?? null}
                    totalDeals={overview?.kpis.totalDeals ?? 0}
                  />
                  <Section id="fi-outlook" eyebrow="Outlook" title="12-Month Outlook" sub="A straight-line trend over this year's monthly totals. Directional only, not investment advice.">
                    <OutlookCards forecast={overview?.forecast ?? null} signals={overview?.signals ?? []} />
                  </Section>
                </>
              )}

              {overview && !empty && (
                <div data-reveal className="mt-10 flex justify-end border-0 border-t border-solid border-fi-line pt-5">
                  <Link href="/dashboard/funding/deals" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fi-primary no-underline hover:underline focus-visible:outline-2 focus-visible:outline-fi-primary">
                    Explore all deals <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </HighlightProvider>
      </div>
    </div>
  );
}
