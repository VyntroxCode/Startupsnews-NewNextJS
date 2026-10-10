'use client';

import { ArrowDownRight, ArrowUpRight, ChevronDown, Globe } from 'lucide-react';
import type { FundingOverview } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useCountUp } from './motion';
import { mono } from './parts';
import type { YoY } from './selectors';

/** Round (1x1) flag SVGs on S3 — the same set /events uses (flag-icons, keyed by ISO alpha-2). */
const FLAG_BASE_URL = 'https://startupnews-media-2026.s3.us-east-1.amazonaws.com/startupnews-in/flags/1x1';

/** Country dropdown. Only India is selectable for now; the rest are listed but disabled. */
const COUNTRIES = [
  { value: 'India', label: 'India', iso: 'in', enabled: true },
  { value: 'USA', label: 'USA', iso: 'us', enabled: false },
  { value: '', label: 'All Countries', iso: '', enabled: false },
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
      <div className="text-[11px] font-semibold tracking-[0.01em] text-fi-ink-faint">{label}</div>
      <div className="mt-1 truncate text-[17px] font-bold tracking-[-0.01em] text-fi-ink sm:text-[19px]">{children}</div>
      {sub && <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11.5px] text-fi-ink-faint">{sub}</div>}
    </div>
  );
}

interface Props {
  overview: FundingOverview | null;
  yoy: YoY | null;
  country: string;
  onCountry: (country: string) => void;
}

/**
 * Funding overview hero (pink → white → violet gradient card). Total funding is the one dominant figure; the other five metrics
 * sit in a lighter divided row. While loading it shows skeletons — never "$0 / 0 deals".
 */
export default function OverviewHero({ overview, yoy, country, onCountry }: Props) {
  const k = overview?.kpis;
  const year = overview?.pinned.year ?? new Date().getFullYear();
  const empty = !!k && k.totalDeals === 0;
  const selected = COUNTRIES.find((c) => c.value === country);
  const where = selected?.label ?? country;
  const vsLabel = `vs the same dates in ${year - 1}`;

  return (
    <section aria-labelledby="fi-hero-h" data-reveal className="mt-4 rounded-[16px] border border-solid border-fi-primary-soft bg-linear-to-br from-fi-primary-soft via-fi-primary-light to-fi-ai/15 px-4 pb-2 pt-5 shadow-fi sm:px-7 sm:pt-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold tracking-[0.01em] text-fi-primary">Indian Startups Funding States Till Today</div>
          <h2 id="fi-hero-h" className="m-0 mt-1 text-[23px] font-semibold tracking-[-0.01em] text-fi-ink sm:text-[26px]">
            1 Jan – today, {year}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-fi-ink">
            {selected?.iso ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny SVG from S3; next/image refuses SVG without dangerouslyAllowSVG
              <img src={`${FLAG_BASE_URL}/${selected.iso}.svg`} alt="" width={24} height={24} className="size-6 shrink-0 rounded-full border border-solid border-fi-line object-cover" />
            ) : (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-solid border-fi-line bg-fi-surface text-fi-ink-soft"><Globe size={14} aria-hidden /></span>
            )}
            {where}
          </div>
        </div>

        <div className="min-w-0 lg:text-right" aria-live="polite">
          <div className="relative mb-4 inline-block">
            <label htmlFor="fi-hero-country" className="sr-only">Country</label>
            <select
              id="fi-hero-country"
              value={country}
              onChange={(e) => onCountry(e.target.value)}
              className="cursor-pointer appearance-none rounded-full border border-solid border-fi-line bg-fi-surface py-1.5 pl-3.5 pr-8 text-[12.5px] font-semibold text-fi-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fi-primary"
            >
              {COUNTRIES.map((c) => (
                <option key={c.label} value={c.value} disabled={!c.enabled}>{c.label}{c.enabled ? '' : ' (coming soon)'}</option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fi-ink-soft" />
          </div>
          <div className="text-[11px] font-semibold tracking-[0.01em] text-fi-ink-faint">Total Funding</div>
          {!k ? (
            <div className="mt-2 h-[52px] w-[220px] animate-pulse rounded-lg bg-fi-bg motion-reduce:animate-none lg:ml-auto" aria-label="Loading" />
          ) : empty ? (
            <div className="mt-1 max-w-[320px] text-[14px] leading-normal text-fi-ink-soft">No deals tracked for {where} in {year} yet.</div>
          ) : (
            <>
              <div className="mt-0.5 inline-block bg-linear-to-r from-fi-primary to-fi-ai bg-clip-text text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-transparent sm:text-[52px]">
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
            <Metric label="Avg. Round" sub={<Delta value={yoy?.avg ?? null} label={vsLabel} />}>
              {empty ? '—' : <CountUp value={k.avgRound} format={formatUsdMn} />}
            </Metric>
            <Metric label="Active Sectors" sub={empty ? undefined : 'with at least one deal'}>
              {empty ? '—' : <CountUp value={k.activeSectors} format={fmtInt} />}
            </Metric>
            <Metric label="Leading Sector" sub={k.leadingSector ? <span className={mono}>{formatUsdMn(k.leadingSector.total)}</span> : undefined}>
              <span title={k.leadingSector?.key}>{k.leadingSector?.key ?? '—'}</span>
            </Metric>
            <div className="col-span-2 sm:col-span-1">
              <Metric label="Most Active Investor" sub={k.topInvestor ? `${k.topInvestor.count} deals joined` : undefined}>
                <span title={k.topInvestor?.key}>{k.topInvestor?.key ?? '—'}</span>
              </Metric>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
