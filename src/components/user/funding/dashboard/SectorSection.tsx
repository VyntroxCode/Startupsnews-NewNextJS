'use client';

import dynamic from 'next/dynamic';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { hlProps, hlState, useHighlight } from './highlight';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, primaryCard, supportCard, supportSub, supportTitle } from './parts';
import type { DashboardModel } from './selectors';

const SectorTreemap = dynamic(() => import('./charts/SectorTreemap'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const RANKED = 8;

/** Supporting: the top sectors as a ranked list. Hover/tap a row to light it up everywhere. */
function SectorRanking({ rows, total, colours }: { rows: AggRow[]; total: number; colours: Map<string, string> }) {
  const api = useHighlight();
  const top = rows.slice(0, RANKED);
  const max = Math.max(1, ...top.map((r) => r.total));
  return (
    <ol className="m-0 mt-3 list-none p-0">
      {top.map((r, i) => {
        const state = hlState(api.hl, 'sector', r.key);
        return (
          <li key={r.key} data-reveal-item>
            <button
              type="button"
              aria-pressed={state === 'on'}
              {...hlProps(api, 'sector', r.key)}
              className={`grid w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-md border-0 bg-transparent px-1.5 py-[7px] text-left font-(family-name:--font-db-inter) transition-[background-color,opacity] duration-200 focus-visible:outline-2 focus-visible:outline-fi-primary motion-reduce:transition-none ${state === 'on' ? 'bg-fi-bg' : ''} ${state === 'off' ? 'opacity-45' : ''}`}
            >
              <span className={`${mono} text-[11px] text-fi-ink-faint`}>{i + 1}</span>
              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-semibold text-fi-ink">{r.key}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-fi-bg">
                  <span data-bar className="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(3, (r.total / max) * 100)}%`, backgroundColor: colours.get(r.key) }} />
                </span>
              </span>
              <span className="text-right">
                <span className={`${mono} block text-[12px] font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</span>
                <span className="block text-[10.5px] text-fi-ink-faint">{r.count} deals · {pct(total ? (r.total / total) * 100 : 0)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Primary: sector treemap (all sectors) + supporting ranking of the top 8. */
export default function SectorSection({ rows, total, model }: { rows: AggRow[] | null; total: number; model: DashboardModel | null }) {
  const compact = useCompact();
  const height = compact ? 260 : 400;
  const top = rows?.[0];
  const conc = model?.concentration ?? null;

  const ranking = (
    <div className={supportCard}>
      <h3 className={supportTitle}>Top sectors</h3>
      <p className={supportSub}>
        {conc !== null && rows && rows.length > 3 ? <>Top 3 sectors hold <b className="text-fi-ink">{pct(conc)}</b> of all capital.</> : 'By capital raised.'}
      </p>
      {rows && model ? <SectorRanking rows={rows} total={total} colours={model.colours} /> : <ChartSkeleton height={300} />}
    </div>
  );

  return (
    <Section id="fi-sector" eyebrow="Where the money goes" title="Capital by sector" sub="Each tile is a sector, sized by the money it raised. Hover or tap one to trace it through the charts below.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {compact && ranking}
        <div className={primaryCard}>
          {!rows || !model ? (
            <ChartSkeleton height={height} />
          ) : !model.tiles.length ? (
            <div style={{ height }}><EmptyNote>No sector data for this selection.</EmptyNote></div>
          ) : (
            <ChartFigure
              label="Funding by sector treemap"
              summary={top ? `${rows.length} sectors. ${top.key} leads with ${formatUsdMn(top.total)} across ${top.count} deals.` : ''}
              height={height}
            >
              <SectorTreemap tiles={model.tiles} />
            </ChartFigure>
          )}
        </div>
        {!compact && ranking}
      </div>
    </Section>
  );
}
