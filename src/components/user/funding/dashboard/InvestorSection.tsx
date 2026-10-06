'use client';

import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';
import type { AggRow, InvestorRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { PALETTE } from '../ui';
import { useReducedMotion } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, supportCard, supportSub, supportTitle } from './parts';

const ModelDonut = dynamic(() => import('./charts/SmallCharts').then((m) => m.ModelDonut), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const th = 'border-0 border-b border-solid border-fi-line px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-fi-ink-faint';

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
            <th scope="col" className={`${th} text-right`}>Capital in rounds joined*</th>
            <th scope="col" className={`${th} text-right`}>Deals</th>
            <th scope="col" className={`${th} text-right`}>Led</th>
            <th scope="col" className={`${th} hidden text-right sm:table-cell`}>Share of deals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} data-reveal-item className="transition-colors hover:bg-fi-bg">
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-[11px] text-fi-ink-faint`}>{i + 1}</td>
              <td className="border-0 border-b border-solid border-fi-line px-2 py-2.5">
                <div className="font-semibold text-fi-ink">{r.key}</div>
                <div className="mt-1 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-fi-bg">
                  <div data-bar className="h-full rounded-full bg-fi-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(3, (r.total / max) * 100)}%` }} />
                </div>
              </td>
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</td>
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right`}>{r.count}</td>
              <td className={`${mono} border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right text-fi-ink-soft`}>{r.leads}</td>
              <td className={`${mono} hidden border-0 border-b border-solid border-fi-line px-2 py-2.5 text-right text-fi-ink-soft sm:table-cell`}>{pct(totalDeals ? (r.count / totalDeals) * 100 : 0)}</td>
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
          <span className={`${mono} w-4 shrink-0 text-[11px] text-fi-ink-faint`}>{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-fi-ink" title={r.key}>{r.key}</span>
          <span className={`${mono} shrink-0 text-[12px] font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</span>
          <span className="w-14 shrink-0 text-right text-[10.5px] text-fi-ink-faint">{r.count} {r.count === 1 ? 'round' : 'rounds'}</span>
        </li>
      ))}
    </ol>
  );
}

/** Supporting row: investor board (wide) + top companies and business-model mix (stacked). */
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
  const modelTotal = models?.reduce((a, m) => a + m.total, 0) ?? 0;
  return (
    <Section id="fi-who" eyebrow="Who is investing" title="Investors and companies" sub="The most active backers this period, the startups that raised the most, and the business models money went into.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={supportCard}>
          <h3 className={supportTitle}>Top investors</h3>
          <p className={supportSub}>Ranked by the capital of the rounds they joined.</p>
          <div className="mt-3">
            {!investors ? <ChartSkeleton height={360} /> : !investors.length ? <EmptyNote>No investor data for this selection.</EmptyNote> : <InvestorBoard rows={investors} totalDeals={totalDeals} />}
          </div>
          <p className="m-0 mt-3 flex items-start gap-1.5 text-[11px] leading-normal text-fi-ink-faint">
            <Info size={13} className="mt-px shrink-0" aria-hidden />
            <span>* Full round amount is credited to every participating investor; these figures overlap and must not be added together. “Led” = deals where they are a lead investor.</span>
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className={supportCard}>
            <h3 className={supportTitle}>Top companies</h3>
            <p className={supportSub}>Startups that raised the most this period.</p>
            {!companies ? <ChartSkeleton height={260} /> : !companies.length ? <EmptyNote>No company data for this selection.</EmptyNote> : <Companies rows={companies} />}
          </div>

          {models && models.length > 0 && modelTotal > 0 && (
            <div className={supportCard}>
              <h3 className={supportTitle}>Business models</h3>
              <p className={supportSub}>Share of capital by business model.</p>
              <div className="mt-3 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4">
                <ChartFigure label="Capital by business model" summary={models.map((m) => `${m.key}: ${formatUsdMn(m.total)}`).join('. ')} height={120}>
                  <ModelDonut rows={models} reduced={reduced} />
                </ChartFigure>
                <ul className="m-0 list-none p-0 text-[12px]">
                  {models.map((m, i) => (
                    <li key={m.key} className="flex items-center gap-2 py-[3px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PALETTE[(i + 2) % PALETTE.length] }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-fi-ink">{m.key}</span>
                      <span className={`${mono} text-fi-ink-soft`}>{pct((m.total / modelTotal) * 100)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
