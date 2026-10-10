'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, primaryCard, supportCard, supportSub, supportTitle } from './parts';
import { PALETTE, PALETTE_BG } from '../ui';
import type { CityPoint } from './selectors';

const CityBubble = dynamic(() => import('./charts/CityBubble'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const LEADERS = 8;

/** Top cities by capital. Each row's dot and bar use that city's bubble colour; pointing at a row picks it out in the bubble chart. */
function Leaderboard({ rows, total, active, onActive }: { rows: AggRow[]; total: number; active: string | null; onActive: (city: string | null) => void }) {
  const top = rows.slice(0, LEADERS);
  const max = Math.max(1, ...top.map((r) => r.total));
  return (
    <ol className="m-0 mt-3 list-none p-0" onMouseLeave={() => onActive(null)}>
      {top.map((r, i) => (
        <li
          key={r.key}
          data-reveal-item
          onMouseEnter={() => onActive(r.key)}
          className={`-mx-2 grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-lg px-2 py-2 transition-[background-color,opacity] duration-150 motion-reduce:transition-none ${active === r.key ? 'bg-fi-bg' : active ? 'opacity-45' : ''}`}
        >
          <span className={`${mono} text-[11.5px] text-fi-ink-soft`}>{i + 1}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${PALETTE_BG[i % PALETTE_BG.length]}`} />
              <span className="truncate text-[13px] font-bold text-fi-ink">{r.key}</span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-fi-line">
              <span data-bar className={`block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${PALETTE_BG[i % PALETTE_BG.length]}`} style={{ width: `${Math.max(3, (r.total / max) * 100)}%` }} />
            </span>
          </span>
          <span className="text-right">
            <span className={`${mono} block whitespace-nowrap text-[12.5px] font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</span>
            <span className="block whitespace-nowrap text-[11px] text-fi-ink-soft">{r.count} deals · {pct(total ? (r.total / total) * 100 : 0)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Primary: cities by deal volume vs average round (bubble = $). Supporting: top-8 leaderboard. */
export default function CitySection({ rows, points, total }: { rows: AggRow[] | null; points: CityPoint[] | null; total: number }) {
  const compact = useCompact();
  const [active, setActive] = useState<string | null>(null);
  // Leaderboard order decides the colour, so a city is the same colour on both cards.
  const colours = useMemo(() => new Map((rows ?? []).slice(0, LEADERS).map((r, i) => [r.key, PALETTE[i % PALETTE.length]])), [rows]);
  const height = compact ? 300 : 400;
  const leader = rows?.[0];
  const topShare = rows && total ? (rows.slice(0, 3).reduce((a, r) => a + r.total, 0) / total) * 100 : null;

  const board = (
    <div className={supportCard}>
      <h3 className={supportTitle}>City Leaderboard</h3>
      <p className={supportSub}>
        {topShare !== null && rows && rows.length > 3 ? <>The top 3 cities raised <b className="text-fi-ink">{pct(topShare)}</b> of all capital.</> : 'By capital raised.'}
      </p>
      {rows ? <Leaderboard rows={rows} total={total} active={active} onActive={setActive} /> : <ChartSkeleton height={300} />}
    </div>
  );

  return (
    <Section id="fi-city" eyebrow="Where Funding Concentrates" title="Cities: Volume Vs. Cheque Size" sub="Further right = more deals. Higher up = bigger average round. Bigger bubble = more capital.">
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
              <CityBubble points={points} labelled={compact ? 5 : LEADERS} colours={colours} active={active} />
            </ChartFigure>
          )}
          {!!points?.length && (
            <p className="m-0 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-fi-ink-soft">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="flex gap-0.5">{PALETTE_BG.slice(0, 4).map((c) => <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />)}</span>
                Top {Math.min(LEADERS, colours.size)} cities, same colours as the leaderboard
              </span>
              {points.length > colours.size && (
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#C9C5CF]" /> Other cities</span>
              )}
            </p>
          )}
        </div>
        {!compact && board}
      </div>
    </Section>
  );
}
