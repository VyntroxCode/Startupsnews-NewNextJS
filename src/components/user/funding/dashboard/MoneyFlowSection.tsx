'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MoveHorizontal } from 'lucide-react';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { hlProps, hlState, useHighlight } from './highlight';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, supportCard, supportSub, supportTitle } from './parts';
import type { DashboardModel, HeatGrid } from './selectors';

const MoneySankey = dynamic(() => import('./charts/MoneySankey'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

/** Funding-lifecycle position of a round stage, so the grid's columns read left to right from earliest to latest. */
function stageRank(stage: string): number {
  const k = stage.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  if (k === 'other') return 999;
  if (k === 'unspecified') return 998;
  if (k === 'angel') return 0;
  if (k === 'pre seed') return 1;
  if (k === 'seed') return 2;
  const series = k.match(/^(pre )?series ([a-z])$/);
  if (series) return 10 + (series[2].charCodeAt(0) - 97) * 2 - (series[1] ? 1 : 0);
  if (k === 'bridge') return 80;
  if (k === 'debt') return 81;
  return 90;
}

const headBtn = 'box-border block w-full cursor-pointer rounded-md border border-solid px-2 py-2 text-[11.5px] font-bold leading-tight transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fi-primary motion-reduce:transition-none';
const headTone = { on: 'border-fi-ink bg-fi-ink text-white', off: 'border-fi-line bg-fi-bg text-fi-ink-faint', none: 'border-fi-line bg-fi-bg text-fi-ink' };
const HEAT_SCALE = [0.08, 0.29, 0.5, 0.71, 0.92];

/**
 * Supporting (desktop): sector × stage grid. Colour = $, number = deals. Equal-width columns in
 * lifecycle order; pointing at a cell lights its sector and stage names, and the row/column also
 * follows the page-wide highlight.
 */
function HeatTable({ heat }: { heat: HeatGrid }) {
  const api = useHighlight();
  const [hover, setHover] = useState<{ sector: string; stage: string } | null>(null);
  const stages = useMemo(() => [...heat.stages].sort((x, y) => stageRank(x) - stageRank(y)), [heat.stages]);
  const rowOn = (se: string) => hover?.sector === se || hlState(api.hl, 'sector', se) === 'on';
  const colOn = (st: string) => hover?.stage === st || hlState(api.hl, 'stage', st) === 'on';
  const active = !!hover || !!api.hl;
  const tone = (on: boolean) => headTone[on ? 'on' : active ? 'off' : 'none'];

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <table className="w-full table-fixed border-separate border-spacing-1 text-[12px]" style={{ minWidth: 150 + stages.length * 78 }} onMouseLeave={() => setHover(null)}>
          <caption className="sr-only">Deals and funding by sector (rows) and round stage (columns)</caption>
          <colgroup>
            <col className="w-[150px]" />
            {stages.map((st) => <col key={st} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-[1] bg-fi-surface px-2 py-2 text-left align-middle text-[11px] font-semibold text-fi-ink-faint">Sector ↓ · Stage →</th>
              {stages.map((st) => (
                <th key={st} scope="col" className="p-0 align-middle">
                  <button type="button" title={st} aria-pressed={hlState(api.hl, 'stage', st) === 'on'} {...hlProps(api, 'stage', st)} className={`${headBtn} truncate text-center ${tone(colOn(st))}`}>
                    {st}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heat.sectors.map((se) => (
              <tr key={se} data-reveal-item>
                <th scope="row" className="sticky left-0 z-[1] bg-fi-surface p-0 text-left">
                  <button type="button" title={se} aria-pressed={hlState(api.hl, 'sector', se) === 'on'} {...hlProps(api, 'sector', se)} className={`${headBtn} truncate text-left ${tone(rowOn(se))}`}>
                    {se}
                  </button>
                </th>
                {stages.map((st) => {
                  const c = heat.cell(se, st);
                  const lit = rowOn(se) || colOn(st);
                  const here = hover?.sector === se && hover.stage === st;
                  const a = c ? 0.08 + c.intensity * 0.84 : 0;
                  return (
                    <td
                      key={st}
                      title={c ? `${se} × ${st}: ${formatUsdMn(c.total)}, ${c.count} deals` : `${se} × ${st}: no deals`}
                      onMouseEnter={() => setHover({ sector: se, stage: st })}
                      className={`h-9 rounded-md text-center text-[12.5px] font-semibold transition-opacity duration-150 motion-reduce:transition-none ${mono} ${active && !lit ? 'opacity-35' : ''} ${here ? 'outline-2 -outline-offset-2 outline-fi-ink' : ''}`}
                      style={{ backgroundColor: c ? `rgba(224, 21, 82, ${a.toFixed(3)})` : '#FAF9FB', color: !c ? '#9C99A6' : a > 0.5 ? '#FFFFFF' : '#15131A' }}
                    >
                      {c ? c.count : <span aria-label="no deals">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-fi-ink-faint" aria-hidden>
        Less capital
        <span className="flex gap-1">
          {HEAT_SCALE.map((a) => <span key={a} className="h-3 w-6 rounded-sm" style={{ backgroundColor: `rgba(224, 21, 82, ${a})` }} />)}
        </span>
        More capital
      </div>
    </div>
  );
}

/** Supporting (phones): each sector's three biggest stages — same cells as the grid, no sideways scroll. */
function HeatList({ heat }: { heat: HeatGrid }) {
  return (
    <ul className="m-0 mt-1 list-none divide-y divide-solid divide-fi-line p-0">
      {heat.sectors.map((se) => (
        <li key={se} className="py-2.5">
          <div className="text-[12.5px] font-semibold text-fi-ink">{se}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {heat.topStages(se, 3).map((s) => (
              <span key={s.stage} className={`rounded-full bg-fi-primary-light px-2 py-0.5 text-[11px] text-fi-primary-dark ${mono}`}>
                {s.stage} · {formatUsdMn(s.total)} · {s.count}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Primary centrepiece: stage → sector Sankey (full width). Supporting: the sector × stage heatmap. */
export default function MoneyFlowSection({ model, totalDeals }: { model: DashboardModel | null; totalDeals: number }) {
  const compact = useCompact();
  const flow = model?.flow;
  const biggest = flow?.links.length ? flow.links.reduce((a, l) => (l.value > a.value ? l : a)) : null;

  return (
    <Section
      id="fi-flow"
      eyebrow="Money Flow"
      title="From Round Stage To Sector"
      sub="Each band is real capital: one deal, one stage, one sector. Hover a band, stage or sector to trace it; the heatmap below follows."
    >
      <div className="box-border min-w-0 rounded-[16px] border border-solid border-fi-line bg-fi-surface px-3 py-4 shadow-fi sm:px-6 sm:py-6">
        {biggest && (
          <p className="m-0 mb-3 px-1 text-[12.5px] text-fi-ink-soft">
            Biggest single flow: <b className="text-fi-ink">{biggest.stage} → {biggest.sector}</b>, <span className={mono}>{formatUsdMn(biggest.value)}</span> across {biggest.count} deals.
          </p>
        )}
        {!flow ? (
          <ChartSkeleton height={440} />
        ) : flow.links.length < 2 ? (
          <div style={{ height: 200 }}><EmptyNote>Not enough deals to draw flows for this selection.</EmptyNote></div>
        ) : (
          <>
            {compact && (
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-fi-ink-faint"><MoveHorizontal size={13} aria-hidden /> Scroll sideways to see every sector</div>
            )}
            <div className="overflow-x-auto overscroll-x-contain">
              <div className="min-w-[680px]">
                <ChartFigure
                  label="Funding flow from round stage to sector"
                  summary={`Flows between ${flow.nodes.filter((n) => n.kind === 'stage').length} round stages and ${flow.nodes.filter((n) => n.kind === 'sector').length} sectors across ${totalDeals} deals.${biggest ? ` Largest: ${biggest.stage} to ${biggest.sector}, ${formatUsdMn(biggest.value)} in ${biggest.count} deals.` : ''}`}
                  height={compact ? 420 : 460}
                >
                  <MoneySankey flow={flow} />
                </ChartFigure>
              </div>
            </div>
          </>
        )}
      </div>

      {model && model.heat.sectors.length > 0 && (
        <div className={`${supportCard} mt-4`}>
          <h3 className={supportTitle}>Sector × Stage</h3>
          <p className={supportSub}>{compact ? 'Each sector’s three biggest round stages ($ · deals).' : 'Each box is the number of deals; deeper pink means more capital. Point at a box, a sector or a stage to highlight it.'}</p>
          <div className="mt-3">{compact ? <HeatList heat={model.heat} /> : <HeatTable heat={model.heat} />}</div>
        </div>
      )}
    </Section>
  );
}
