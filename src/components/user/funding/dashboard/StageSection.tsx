'use client';

import dynamic from 'next/dynamic';
import type { AggRow, SizeBandRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useCompact, useReducedMotion } from './media';
import { BAND_PALETTE } from '../ui';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, primaryCard, supportCard, supportSub, supportTitle } from './parts';

const StageBars = dynamic(() => import('./charts/StageBars'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });
const SizeBandChart = dynamic(() => import('./charts/SmallCharts').then((m) => m.SizeBandChart), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

/** Primary: capital by round stage. Supporting: how many deals fall in each round-size band. */
export default function StageSection({ stages, bands }: { stages: AggRow[] | null; bands: SizeBandRow[] | null }) {
  const compact = useCompact();
  const reduced = useReducedMotion();
  const barsHeight = Math.max(240, (stages?.length ?? 8) * (compact ? 36 : 44) + 40);
  const bandsTotal = bands?.reduce((a, b) => a + b.count, 0) ?? 0;
  const topBand = bands && bandsTotal ? [...bands].sort((a, b) => b.count - a.count)[0] : null;

  return (
    <Section id="fi-stage" eyebrow="How Deals Are Structured" title="Capital By Round Stage" sub="Which rounds carry the money, and how big the typical cheque is. Tap a stage to follow it into the flow below.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={primaryCard}>
          <h3 className={supportTitle}>Funding By Stage</h3>
          <p className={`${supportSub} mb-3`}>Bar length is capital raised; the label adds the number of deals.</p>
          {!stages ? (
            <ChartSkeleton height={barsHeight} />
          ) : !stages.length ? (
            <div style={{ height: 240 }}><EmptyNote>No stage data for this selection.</EmptyNote></div>
          ) : (
            <ChartFigure
              label="Funding by round stage"
              summary={stages.map((s) => `${s.key}: ${formatUsdMn(s.total)}, ${s.count} deals`).join('. ')}
              height={barsHeight}
            >
              <StageBars rows={stages} />
            </ChartFigure>
          )}
        </div>
        <div className={supportCard}>
          <h3 className={supportTitle}>Round Sizes</h3>
          <p className={supportSub}>
            {topBand ? <>Most deals are <b className="text-fi-ink">{topBand.label.toLowerCase()}</b> ({topBand.range}).</> : 'Deals by round size.'}
          </p>
          <div className="mt-3">
            {!bands ? (
              <ChartSkeleton height={240} />
            ) : !bandsTotal ? (
              <div style={{ height: 240 }}><EmptyNote>No disclosed amounts.</EmptyNote></div>
            ) : (
              <ChartFigure label="Deals by round size" summary={bands.map((b) => `${b.label} (${b.range}): ${b.count} deals`).join('. ')} height={240}>
                <SizeBandChart bands={bands} reduced={reduced} />
              </ChartFigure>
            )}
          </div>
          {bands && bandsTotal > 0 && (
            <dl className="m-0 mt-4 grid grid-cols-1 gap-1.5 border-0 border-t border-solid border-fi-line pt-3 text-[12px] text-fi-ink">
              {bands.map((b, i) => b.count > 0 && (
                <div key={b.key} className="grid grid-cols-[10px_minmax(0,1fr)_auto_44px] items-center gap-x-2.5 rounded-md bg-fi-bg px-2.5 py-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BAND_PALETTE[i % BAND_PALETTE.length] }} aria-hidden />
                  <dt className="min-w-0 truncate font-semibold">{b.label} <span className="font-normal text-fi-ink-soft">{b.range}</span></dt>
                  <dd className={`${mono} m-0 font-semibold`}>{b.count.toLocaleString('en-IN')}</dd>
                  <dd className={`${mono} m-0 text-right text-[11px] text-fi-ink-soft`}>{pct((b.count / bandsTotal) * 100)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </Section>
  );
}
