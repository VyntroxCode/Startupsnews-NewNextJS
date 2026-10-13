'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { AggRow, SectorTrend } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useCompact } from './media';
import { ChartFigure, ChartSkeleton, EmptyNote, Section, mono, pct, primaryCard, supportCard, supportSub, supportTitle } from './parts';
import { INK, NEUTRAL, deltaPct, type DashboardModel } from './selectors';

const SectorTreemap = dynamic(() => import('./charts/SectorTreemap'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });
const SectorLines = dynamic(() => import('./charts/SectorLines'), { ssr: false, loading: () => <ChartSkeleton height="100%" /> });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = (values: (number | null)[]) => values.reduce<number>((a, v) => a + (v ?? 0), 0);

/** One figure in the selected-sector read-out: a line swatch, the year and months it covers, the $. */
function YearFigure({ swatch, label, value }: { swatch: React.ReactNode; label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] text-fi-ink-soft">{swatch}{label}</div>
      <div className={`${mono} mt-0.5 text-[15px] font-semibold text-fi-ink`}>{formatUsdMn(value)}</div>
    </div>
  );
}

/**
 * Supporting: capital per month as lines. With no sector picked it draws the top (coloured) sectors
 * for the current year; picking one — a treemap tile, or the dropdown here, which is also the
 * keyboard and screen-reader route — switches it to that sector's two years, this year against last.
 */
function SectorTrendCard({
  trend,
  model,
  selected,
  onSelect,
  compact,
}: {
  trend: SectorTrend | null;
  model: DashboardModel | null;
  selected: string | null;
  onSelect: (sector: string | null) => void;
  compact: boolean;
}) {
  const one = selected && trend ? trend.series.find((s) => s.sector === selected) : undefined;
  const base = compact ? 260 : 368;
  const months = trend ? (trend.lastMonth > 1 ? `Jan–${MONTHS[trend.lastMonth - 1]}` : 'Jan') : '';

  let body: React.ReactNode = <ChartSkeleton height={base} />;
  let sub: React.ReactNode = 'Capital raised each month.';
  let readout: React.ReactNode = null;

  if (trend && model) {
    const lined = trend.series.filter((s) => (model.colours.get(s.sector) ?? NEUTRAL) !== NEUTRAL);
    let summary: string;
    if (one) {
      const colour = model.colours.get(one.sector);
      const stroke = !colour || colour === NEUTRAL ? INK : colour;
      const current = sum(one.current);
      const samePeriod = sum(one.previous.slice(0, trend.lastMonth));
      const change = deltaPct(current, samePeriod);
      sub = `${trend.year} against ${trend.previousYear}, month by month.`;
      summary = `${one.sector}: ${formatUsdMn(current)} in ${months} ${trend.year}, ${formatUsdMn(samePeriod)} in the same months of ${trend.previousYear}, ${formatUsdMn(sum(one.previous))} in all of ${trend.previousYear}.`;
      readout = (
        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <YearFigure swatch={<span aria-hidden className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: stroke }} />} label={`${trend.year} · ${months}`} value={current} />
          <YearFigure swatch={<span aria-hidden className="w-3.5 border-0 border-t-2 border-dashed border-fi-ink-faint" />} label={`${trend.previousYear} · ${months}`} value={samePeriod} />
          {change !== null && (
            <span className={`${mono} mb-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${change >= 0 ? 'bg-fi-green-light text-fi-green' : 'bg-fi-red-light text-fi-red'}`}>
              {change >= 0 ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />}
              {change >= 0 ? '+' : ''}{pct(change)}
            </span>
          )}
        </div>
      );
    } else {
      const conc = model.concentration;
      sub = (
        <>
          Top {lined.length} sectors, month by month in {trend.year}.
          {conc !== null && trend.series.length > 3 ? <> Top 3 hold <b className="text-fi-ink">{pct(conc)}</b> of all capital.</> : null}
        </>
      );
      summary = `Monthly capital for the top ${lined.length} sectors, ${months} ${trend.year}: ${lined.map((s) => `${s.sector} ${formatUsdMn(sum(s.current))}`).join(', ')}.`;
    }
    // The read-out row takes its height out of the chart, so the card stays level with the treemap.
    const height = one && !compact ? base - 52 : base;
    body = !lined.length && !one ? (
      <div style={{ height }}><EmptyNote>No sector data for this selection.</EmptyNote></div>
    ) : (
      <ChartFigure label={one ? `${one.sector} funding, ${trend.year} against ${trend.previousYear}` : 'Monthly funding by sector'} summary={summary} height={height} className="mt-3">
        <SectorLines trend={trend} colours={model.colours} selected={one ? one.sector : null} compact={compact} />
      </ChartFigure>
    );
  }

  return (
    <div className={supportCard}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className={supportTitle}>{one ? one.sector : 'Sector Trend'}</h3>
          <p className={supportSub}>{sub}</p>
        </div>
        {trend && trend.series.length > 0 && (
          <select
            aria-label="Sector shown in the line chart"
            value={one ? one.sector : ''}
            onChange={(e) => onSelect(e.target.value || null)}
            className="box-border max-w-[170px] cursor-pointer rounded-lg border border-solid border-fi-line bg-fi-bg px-2 py-1.5 text-[12.5px] font-semibold text-fi-ink focus:border-fi-primary focus:outline-2 focus:outline-fi-primary-light"
          >
            <option value="">Top Sectors</option>
            {trend.series.map((s) => <option key={s.sector} value={s.sector}>{s.sector}</option>)}
          </select>
        )}
      </div>
      {readout}
      {body}
    </div>
  );
}

/** Primary: sector treemap (all sectors) + supporting line chart, driven by the tile that is clicked. */
export default function SectorSection({ rows, trend, model }: { rows: AggRow[] | null; trend: SectorTrend | null; model: DashboardModel | null }) {
  const compact = useCompact();
  const height = compact ? 260 : 400;
  const top = rows?.[0];
  // Held here, not in the cross-chart highlight: that one clears when the pointer leaves a tile.
  // A sector that drops out of the data (country switch) simply stops matching in the card.
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Section id="fi-sector" eyebrow="Where The Money Goes" title="Capital By Sector" sub="Each tile is a sector, sized by the money it raised. Click a tile to see that sector's last two years.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
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
              <SectorTreemap tiles={model.tiles} selected={selected} onSelect={(s) => setSelected((cur) => (cur === s ? null : s))} />
            </ChartFigure>
          )}
        </div>
        <SectorTrendCard trend={trend} model={model} selected={selected} onSelect={setSelected} compact={compact} />
      </div>
    </Section>
  );
}
