'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';
import type { AggRow, InvestorRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { PALETTE } from '../ui';
import { useReducedMotion } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, supportCard, supportSub, supportTitle } from './parts';

const ModelBars = dynamic(() => import('./charts/ModelBars'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });
const ModelDonut = dynamic(() => import('./charts/SmallCharts').then((m) => m.ModelDonut), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const th = 'border-0 border-b border-solid border-fi-line px-2 py-2 text-left text-[12px] font-bold tracking-[0.01em] text-fi-ink';

/**
 * Investors. A round's full amount is credited to every investor on it, so the capital column
 * overlaps across rows — it is labelled "Capital in rounds joined", never totalled, and the share
 * column is share of deals (not of money).
 */
function InvestorBoard({ rows, totalDeals }: { rows: InvestorRow[]; totalDeals: number }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th scope="col" className={`${th} w-6`}>#</th>
            <th scope="col" className={th}>Investor</th>
            <th scope="col" className={`${th} text-right`}>Capital In Rounds Joined*</th>
            <th scope="col" className={`${th} text-right`}>Deals</th>
            <th scope="col" className={`${th} text-right`}>Led</th>
            <th scope="col" className={`${th} hidden text-right sm:table-cell`}>Share Of Deals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} data-reveal-item className="transition-colors hover:bg-fi-bg">
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-[11.5px] text-fi-ink-soft`}>{i + 1}</td>
              <td className="border-0 border-b border-solid border-fi-line px-2 py-2.5">
                <div className="text-[13.5px] font-bold text-fi-ink">{r.key}</div>
                <div className="mt-1 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-fi-bg">
                  <div data-bar className="h-full rounded-full bg-fi-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(3, (r.total / max) * 100)}%` }} />
                </div>
              </td>
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</td>
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right text-fi-ink`}>{r.count}</td>
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right text-fi-ink`}>{r.leads}</td>
              <td className={`${mono} hidden border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right text-fi-ink sm:table-cell`}>{pct(totalDeals ? (r.count / totalDeals) * 100 : 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Companies({ rows }: { rows: AggRow[] }) {
  return (
    <ol className="m-0 mt-3 list-none p-0">
      {rows.map((r, i) => (
        <li key={r.key} data-reveal-item className="flex items-baseline gap-2.5 border-0 border-b border-solid border-fi-line py-2 last:border-b-0">
          <span className={`${mono} w-4 shrink-0 text-[11.5px] text-fi-ink-soft`}>{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-fi-ink" title={r.key}>{r.key}</span>
          <span className={`${mono} shrink-0 text-[12px] font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</span>
          <span className="w-14 shrink-0 text-right text-[11px] text-fi-ink-soft">{r.count} {r.count === 1 ? 'round' : 'rounds'}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Row 1: investor board (wide) + top companies. Row 2, only when the data has business models:
 * average round per model (wide) + the business-model donut. The two model cards share one colour
 * per model; pointing at a model on the donut or its key fades the others on both cards.
 */
export default function InvestorSection({
  investors,
  companies,
  models,
  totalDeals,
}: {
  investors: InvestorRow[] | null;
  companies: AggRow[] | null;
  models: AggRow[] | null;
  totalDeals: number;
}) {
  const reduced = useReducedMotion();
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const modelTotal = models?.reduce((a, m) => a + m.total, 0) ?? 0;
  // Colour by capital rank (the donut's order), so a model keeps its colour when the bars re-sort.
  const modelColours = useMemo(() => new Map((models ?? []).map((m, i) => [m.key, PALETTE[(i + 2) % PALETTE.length]])), [models]);
  const hasModels = !!models && models.length > 0 && modelTotal > 0;
  const biggest = hasModels ? [...models].filter((m) => m.count > 0).sort((a, b) => b.total / b.count - a.total / a.count)[0] : undefined;
  // Bars grow with the number of models; the donut card matches so the row stays level.
  const modelHeight = Math.max(240, (models?.length ?? 0) * 46 + 44);
  return (
    <Section id="fi-who" eyebrow="Who Is Investing" title="Investors And Companies" sub="The most active backers this period, the startups that raised the most, and the business models money went into.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={supportCard}>
          <h3 className={supportTitle}>Top Investors</h3>
          <p className={supportSub}>Ranked by the capital of the rounds they joined.</p>
          <div className="mt-3">
            {!investors ? <ChartSkeleton height={360} /> : !investors.length ? <EmptyNote>No investor data for this selection.</EmptyNote> : <InvestorBoard rows={investors} totalDeals={totalDeals} />}
          </div>
          <p className="m-0 mt-3 flex items-start gap-1.5 text-[11px] leading-normal text-fi-ink-faint">
            <Info size={13} className="mt-px shrink-0" aria-hidden />
            <span>* Full round amount is credited to every participating investor; these figures overlap and must not be added together. “Led” = deals where they are a lead investor.</span>
          </p>
        </div>

        <div className={supportCard}>
          <h3 className={supportTitle}>Top Companies</h3>
          <p className={supportSub}>Startups that raised the most this period.</p>
          {!companies ? <ChartSkeleton height={260} /> : !companies.length ? <EmptyNote>No company data for this selection.</EmptyNote> : <Companies rows={companies} />}
        </div>

        {hasModels && (
          <>
            <div className={supportCard}>
              <h3 className={supportTitle}>Average Round By Business Model</h3>
              <p className={supportSub}>
                {biggest ? <>Capital raised divided by deals. <b className="text-fi-ink">{biggest.key}</b> rounds are the largest, at {formatUsdMn(biggest.total / biggest.count)} each.</> : 'Capital raised divided by deals.'}
              </p>
              <ChartFigure
                label="Average round size by business model"
                summary={models.filter((m) => m.count > 0).map((m) => `${m.key}: ${formatUsdMn(m.total / m.count)} average across ${m.count} deals`).join('. ')}
                height={modelHeight}
                className="mt-3"
              >
                <ModelBars rows={models} colours={modelColours} active={activeModel} />
              </ChartFigure>
            </div>

            <div className={`${supportCard} flex flex-col`}>
              <h3 className={supportTitle}>Business Models</h3>
              <p className={supportSub}>Share of capital by business model.</p>
              <div className="mt-3 flex flex-1 flex-col justify-center gap-4">
                <div className="relative mx-auto w-full max-w-[230px]">
                  <ChartFigure label="Capital by business model" summary={models.map((m) => `${m.key}: ${formatUsdMn(m.total)}`).join('. ')} height={230}>
                    <ModelDonut rows={models} colours={modelColours} active={activeModel} onActive={setActiveModel} reduced={reduced} />
                  </ChartFigure>
                  {/* Centre of the ring: the total the slices add up to. */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] text-fi-ink-soft">Total Capital</span>
                    <span className={`${mono} text-[18px] font-semibold text-fi-ink`}>{formatUsdMn(modelTotal)}</span>
                  </div>
                </div>
                <ul className="m-0 grid list-none grid-cols-1 gap-x-5 p-0 text-[12.5px] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" onMouseLeave={() => setActiveModel(null)}>
                  {models.map((m) => (
                    <li key={m.key} onMouseEnter={() => setActiveModel(m.key)} className={`flex items-center gap-2 py-1 transition-opacity duration-150 motion-reduce:transition-none ${activeModel && activeModel !== m.key ? 'opacity-45' : ''}`}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: modelColours.get(m.key) }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-semibold text-fi-ink">{m.key}</span>
                      <span className={`${mono} text-fi-ink-soft`}>{formatUsdMn(m.total)}</span>
                      <span className={`${mono} w-9 text-right font-semibold text-fi-ink`}>{pct((m.total / modelTotal) * 100)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
