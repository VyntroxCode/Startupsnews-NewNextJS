'use client';

import dynamic from 'next/dynamic';
import type { TimeBucket, TrendRange } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { segBtn, segWrap } from '../ui';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, primaryCard } from './parts';

const TrendChart = dynamic(() => import('./charts/TrendChart'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const RANGES: { value: TrendRange; label: string; short: string }[] = [
  { value: 'week', label: 'Week on week', short: 'Weekly' },
  { value: 'month', label: 'Month on month', short: 'Monthly' },
  { value: 'year', label: 'Year on year', short: 'Yearly' },
];

function summary(buckets: TimeBucket[]): string {
  if (!buckets.length) return 'No deals in this period.';
  const peak = buckets.reduce((a, b) => (b.total > a.total ? b : a));
  const last = buckets[buckets.length - 1];
  return `${buckets.length} periods from ${buckets[0].label} to ${last.label}. Peak: ${peak.label} with ${formatUsdMn(peak.total)} across ${peak.count} deals. Latest: ${formatUsdMn(last.total)} across ${last.count} deals.`;
}

/** Primary: funding and deal flow over time, with the week / month / year switch. */
export default function TrendSection({ buckets, range, onRange }: { buckets: TimeBucket[] | null; range: TrendRange; onRange: (r: TrendRange) => void }) {
  const compact = useCompact();
  const height = compact ? 240 : 360;
  return (
    <Section
      id="fi-trend"
      eyebrow="Momentum"
      title="Funding over time"
      sub={range === 'year' ? 'Capital raised and deals closed, by year (last five years).' : 'Capital raised and deals closed this year. Is money rising, and is it more deals or bigger rounds?'}
      right={
        <div className={segWrap} role="group" aria-label="Time grouping">
          {RANGES.map((r) => (
            <button key={r.value} type="button" aria-pressed={range === r.value} className={`${segBtn(range === r.value)} focus-visible:outline-2 focus-visible:outline-fi-primary`} onClick={() => onRange(r.value)}>
              {compact ? r.short : r.label}
            </button>
          ))}
        </div>
      }
    >
      <div className={primaryCard}>
        {!buckets ? (
          <ChartSkeleton height={height} />
        ) : !buckets.length ? (
          <div style={{ height }}><EmptyNote>No deals in this period.</EmptyNote></div>
        ) : (
          <ChartFigure label="Funding and deals over time" summary={summary(buckets)} height={height}>
            <TrendChart buckets={buckets} compact={compact} />
          </ChartFigure>
        )}
      </div>
    </Section>
  );
}
