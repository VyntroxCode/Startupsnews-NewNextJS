'use client';

import dynamic from 'next/dynamic';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, primaryCard, supportCard, supportSub, supportTitle } from './parts';
import type { CityPoint } from './selectors';

const CityBubble = dynamic(() => import('./charts/CityBubble'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const LEADERS = 8;

function Leaderboard({ rows, total }: { rows: AggRow[]; total: number }) {
  const top = rows.slice(0, LEADERS);
  const max = Math.max(1, ...top.map((r) => r.total));
  return (
    <ol className="m-0 mt-3 list-none p-0">
      {top.map((r, i) => (
        <li key={r.key} data-reveal-item className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2.5 py-[7px]">
          <span className={`${mono} text-[11px] text-fi-ink-faint`}>{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-fi-ink">{r.key}</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-fi-bg">
              <span data-bar className="block h-full rounded-full bg-fi-ink transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(3, (r.total / max) * 100)}%` }} />
            </span>
          </span>
          <span className="text-right">
            <span className={`${mono} block text-[12px] font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</span>
            <span className="block text-[10.5px] text-fi-ink-faint">{r.count} deals · {pct(total ? (r.total / total) * 100 : 0)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Primary: cities by deal volume vs average round (bubble = $). Supporting: top-8 leaderboard. */
export default function CitySection({ rows, points, total }: { rows: AggRow[] | null; points: CityPoint[] | null; total: number }) {
  const compact = useCompact();
  const height = compact ? 300 : 400;
  const leader = rows?.[0];
  const topShare = rows && total ? (rows.slice(0, 3).reduce((a, r) => a + r.total, 0) / total) * 100 : null;

  const board = (
    <div className={supportCard}>
      <h3 className={supportTitle}>City leaderboard</h3>
      <p className={supportSub}>
        {topShare !== null && rows && rows.length > 3 ? <>The top 3 cities raised <b className="text-fi-ink">{pct(topShare)}</b> of all capital.</> : 'By capital raised.'}
      </p>
      {rows ? <Leaderboard rows={rows} total={total} /> : <ChartSkeleton height={300} />}
    </div>
  );

  return (
    <Section id="fi-city" eyebrow="Where funding concentrates" title="Cities: volume vs. cheque size" sub="Further right = more deals. Higher up = bigger average round. Bigger bubble = more capital.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {compact && board}
        <div className={primaryCard}>
          {!points ? (
            <ChartSkeleton height={height} />
          ) : !points.length ? (
            <div style={{ height }}><EmptyNote>No city data for this selection.</EmptyNote></div>
          ) : (
            <ChartFigure
              label="Cities by deals and average round size"
              summary={leader ? `${points.length} cities. ${leader.key} leads with ${formatUsdMn(leader.total)} across ${leader.count} deals.` : ''}
              height={height}
            >
              <CityBubble points={points} labelled={compact ? 5 : 8} />
            </ChartFigure>
          )}
        </div>
        {!compact && board}
      </div>
    </Section>
  );
}
