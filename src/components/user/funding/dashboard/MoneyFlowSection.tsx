'use client';

import dynamic from 'next/dynamic';
import { MoveHorizontal } from 'lucide-react';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { hlProps, hlState, useHighlight } from './highlight';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, supportCard, supportSub, supportTitle } from './parts';
import type { DashboardModel, HeatGrid } from './selectors';

const MoneySankey = dynamic(() => import('./charts/MoneySankey'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

/** Supporting (desktop): sector × stage grid. Colour = $, number = deals; the row/column follows the highlight. */
function HeatTable({ heat }: { heat: HeatGrid }) {
  const api = useHighlight();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-[11.5px]">
        <caption className="sr-only">Deals and funding by sector (rows) and round stage (columns)</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-fi-surface px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-fi-ink-faint">Sector</th>
            {heat.stages.map((st) => {
              const state = hlState(api.hl, 'stage', st);
              return (
                <th key={st} scope="col" className="p-0 align-bottom">
                  <button type="button" aria-pressed={state === 'on'} {...hlProps(api, 'stage', st)} className={`w-full cursor-pointer whitespace-nowrap rounded border-0 bg-transparent px-1.5 py-1.5 text-[10.5px] font-semibold font-(family-name:--font-db-inter) focus-visible:outline-2 focus-visible:outline-fi-primary ${state === 'on' ? 'text-fi-primary' : state === 'off' ? 'text-fi-ink-faint' : 'text-fi-ink-soft'}`}>
                    {st}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {heat.sectors.map((se) => {
            const rowState = hlState(api.hl, 'sector', se);
            return (
              <tr key={se} data-reveal-item>
                <th scope="row" className="sticky left-0 bg-fi-surface p-0 text-left">
                  <button type="button" aria-pressed={rowState === 'on'} {...hlProps(api, 'sector', se)} className={`w-full cursor-pointer truncate rounded border-0 bg-transparent px-2 py-1.5 text-left text-[11.5px] font-semibold font-(family-name:--font-db-inter) focus-visible:outline-2 focus-visible:outline-fi-primary ${rowState === 'on' ? 'text-fi-primary' : rowState === 'off' ? 'text-fi-ink-faint' : 'text-fi-ink'}`}>
                    {se}
                  </button>
                </th>
                {heat.stages.map((st) => {
                  const c = heat.cell(se, st);
                  const colState = hlState(api.hl, 'stage', st);
                  const dim = rowState === 'off' || colState === 'off';
                  const lit = rowState === 'on' || colState === 'on';
                  const a = c ? 0.08 + c.intensity * 0.84 : 0;
                  return (
                    <td
                      key={st}
                      title={c ? `${se} × ${st}: ${formatUsdMn(c.total)}, ${c.count} deals` : `${se} × ${st}: no deals`}
                      className={`h-8 min-w-[44px] rounded text-center transition-opacity duration-200 motion-reduce:transition-none ${mono} ${dim ? 'opacity-30' : ''} ${lit ? 'outline-1 outline-fi-ink' : ''}`}
                      style={{ backgroundColor: c ? `rgba(224, 21, 82, ${a.toFixed(3)})` : '#FAF9FB', color: a > 0.5 ? '#FFFFFF' : '#5A5763' }}
                    >
                      {c ? c.count : <span aria-label="no deals">·</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
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
      eyebrow="Money flow"
      title="From round stage to sector"
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
          <h3 className={supportTitle}>Sector × stage</h3>
          <p className={supportSub}>{compact ? 'Each sector’s three biggest round stages ($ · deals).' : 'Number = deals; deeper pink = more capital. Hover a row or column to highlight it.'}</p>
          <div className="mt-3">{compact ? <HeatList heat={model.heat} /> : <HeatTable heat={model.heat} />}</div>
        </div>
      )}
    </Section>
  );
}
