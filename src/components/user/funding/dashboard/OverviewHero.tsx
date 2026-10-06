'use client';

import { useRef } from 'react';
import { ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react';
import type { FundingOverview } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useCountUp } from './motion';
import { mono } from './parts';
import type { YoY } from './selectors';

export const COUNTRY_TABS = [
  { value: '', label: '🌍 All countries' },
  { value: 'India', label: '🇮🇳 India' },
  { value: 'USA', label: '🇺🇸 USA' },
];

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-IN');

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold ${mono} ${up ? 'bg-fi-green-light text-fi-green' : 'bg-fi-red-light text-fi-red'}`}
      title={label}
    >
      <Icon size={12} aria-hidden />
      {up ? '+' : '−'}{Math.abs(value).toFixed(0)}%
      <span className="sr-only">{label}</span>
    </span>
  );
}

function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useCountUp<HTMLSpanElement>(value, format);
  return <span ref={ref} className={className}>{format(value)}</span>;
}

function Metric({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div data-reveal-item className="min-w-0 py-3 pr-4 xl:px-5 xl:first:pl-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-fi-ink-faint">{label}</div>
      <div className="mt-1 truncate font-(family-name:--font-fi-space) text-[17px] font-bold tracking-[-0.01em] text-fi-ink sm:text-[19px]">{children}</div>
      {sub && <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11.5px] text-fi-ink-faint">{sub}</div>}
    </div>
  );
}

interface Props {
  overview: FundingOverview | null;
  yoy: YoY | null;
  country: string;
  detectedCountry: string;
  onCountry: (country: string) => void;
}

/**
 * "Funding intelligence" hero. Total funding is the one dominant figure; the other five metrics
 * sit in a lighter divided row. While loading it shows skeletons — never "$0 / 0 deals".
 */
export default function OverviewHero({ overview, yoy, country, detectedCountry, onCountry }: Props) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const k = overview?.kpis;
  const year = overview?.pinned.year ?? new Date().getFullYear();
  const empty = !!k && k.totalDeals === 0;
  const where = COUNTRY_TABS.find((t) => t.value === country)?.label.replace(/^\S+\s/, '') ?? country;
  const vsLabel = `vs the same dates in ${year - 1}`;

  // Arrow keys move between country tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + COUNTRY_TABS.length) % COUNTRY_TABS.length;
    onCountry(COUNTRY_TABS[next].value);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <section aria-labelledby="fi-hero-h" data-reveal className="mt-4 rounded-[16px] border border-solid border-fi-line bg-fi-surface px-4 pb-2 pt-5 shadow-fi sm:px-7 sm:pt-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-fi-primary">Funding intelligence</div>
          <h2 id="fi-hero-h" className="m-0 mt-1 font-(family-name:--font-fi-space) text-[22px] font-bold tracking-[-0.02em] text-fi-ink sm:text-[26px]">
            {year} funding, {where.toLowerCase() === 'all countries' ? 'all countries' : where}
          </h2>
          <p className="m-0 mt-1 text-[12.5px] text-fi-ink-soft">1 Jan – today, {year}. Everything below follows the country you pick.</p>

          <div ref={tabsRef} className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Country">
            {COUNTRY_TABS.map((t, i) => {
              const active = country === t.value;
              return (
                <button
                  key={t.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onCountry(t.value)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`cursor-pointer rounded-full border border-solid px-3.5 py-1.5 text-[12.5px] font-semibold font-(family-name:--font-db-inter) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fi-primary ${active ? 'border-fi-ink bg-fi-ink text-white' : 'border-fi-line bg-fi-surface text-fi-ink-soft hover:border-fi-ink-faint'}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-fi-ink-faint">
            <MapPin size={12} aria-hidden />
            {detectedCountry ? <>Picked <b className="font-semibold text-fi-ink-soft">{detectedCountry}</b> from your time zone. Change it above.</> : country ? <>Showing <b className="font-semibold text-fi-ink-soft">{where}</b>.</> : 'Showing all countries.'}
          </div>
        </div>

        <div className="min-w-0 lg:text-right" aria-live="polite">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-fi-ink-faint">Total funding</div>
          {!k ? (
            <div className="mt-2 h-[52px] w-[220px] animate-pulse rounded-lg bg-fi-bg motion-reduce:animate-none lg:ml-auto" aria-label="Loading" />
          ) : empty ? (
            <div className="mt-1 max-w-[320px] text-[14px] leading-normal text-fi-ink-soft">No deals tracked for {where} in {year} yet.</div>
          ) : (
            <>
              <div className="mt-0.5 font-(family-name:--font-fi-space) text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-fi-ink sm:text-[52px]">
                <CountUp value={k.totalFunding} format={formatUsdMn} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-fi-ink-soft lg:justify-end">
                <Delta value={yoy?.funding ?? null} label={vsLabel} />
                <span>{yoy?.funding !== null && yoy?.funding !== undefined ? vsLabel : `${fmtInt(k.totalDeals)} deals this year`}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 border-0 border-t border-solid border-fi-line sm:grid-cols-3 xl:grid-cols-5 xl:divide-x xl:divide-solid xl:divide-fi-line">
        {!k ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="py-3 pr-4 xl:px-5 xl:first:pl-0"><div className="h-[44px] animate-pulse rounded-md bg-fi-bg motion-reduce:animate-none" /></div>
          ))
        ) : (
          <>
            <Metric label="Deals" sub={<Delta value={yoy?.deals ?? null} label={vsLabel} />}>
              {empty ? '—' : <CountUp value={k.totalDeals} format={fmtInt} />}
            </Metric>
            <Metric label="Avg. round" sub={<Delta value={yoy?.avg ?? null} label={vsLabel} />}>
              {empty ? '—' : <CountUp value={k.avgRound} format={formatUsdMn} />}
            </Metric>
            <Metric label="Active sectors" sub={empty ? undefined : 'with at least one deal'}>
              {empty ? '—' : <CountUp value={k.activeSectors} format={fmtInt} />}
            </Metric>
            <Metric label="Leading sector" sub={k.leadingSector ? <span className={mono}>{formatUsdMn(k.leadingSector.total)}</span> : undefined}>
              <span title={k.leadingSector?.key}>{k.leadingSector?.key ?? '—'}</span>
            </Metric>
            <div className="col-span-2 sm:col-span-1">
              <Metric label="Most active investor" sub={k.topInvestor ? `${k.topInvestor.count} deals joined` : undefined}>
                <span title={k.topInvestor?.key}>{k.topInvestor?.key ?? '—'}</span>
              </Metric>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
