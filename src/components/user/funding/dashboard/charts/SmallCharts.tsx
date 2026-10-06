'use client';

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AggRow, FundingForecast, SizeBandRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { PALETTE } from '../../ui';
import { TipRow, pct } from '../parts';

const TICK = { fill: '#9C99A6', fontSize: 10.5 };

/** Recharts tooltip body in the same white card as the other charts. */
function TipCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="box-border min-w-[150px] rounded-lg border border-solid border-fi-line bg-fi-surface px-3 py-2 text-[12px] text-fi-ink shadow-[0_8px_24px_rgba(21,19,26,0.12)]">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((r) => <TipRow key={r.label} label={r.label} value={r.value} />)}
    </div>
  );
}

type TipArgs<T> = { active?: boolean; payload?: ReadonlyArray<{ payload?: T }> };

/** Deals per round-size band (ROUND_BANDS): are rounds mostly small cheques or mega rounds? */
export function SizeBandChart({ bands, reduced }: { bands: SizeBandRow[]; reduced: boolean }) {
  const totalDeals = bands.reduce((a, b) => a + b.count, 0) || 1;
  const data = bands.map((b) => ({ ...b, short: b.range }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke="#F0EEF2" />
        <XAxis dataKey="short" tick={TICK} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: '#FAF9FB' }}
          content={({ active, payload }: TipArgs<SizeBandRow>) => {
            const d = active ? payload?.[0]?.payload : undefined;
            return d ? (
              <TipCard
                title={`${d.label} (${d.range})`}
                rows={[
                  { label: 'Deals', value: d.count.toLocaleString('en-IN') },
                  { label: 'Share of deals', value: pct((d.count / totalDeals) * 100) },
                  { label: 'Funding', value: formatUsdMn(d.total) },
                ]}
              />
            ) : null;
          }}
        />
        <Bar dataKey="count" fill="#15131A" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={!reduced} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Capital by business model (B2B, B2C, SaaS…) as a donut. */
export function ModelDonut({ rows, reduced }: { rows: AggRow[]; reduced: boolean }) {
  const total = rows.reduce((a, r) => a + r.total, 0) || 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          content={({ active, payload }: TipArgs<AggRow>) => {
            const d = active ? payload?.[0]?.payload : undefined;
            return d ? (
              <TipCard
                title={d.key}
                rows={[
                  { label: 'Funding', value: formatUsdMn(d.total) },
                  { label: 'Share of capital', value: pct((d.total / total) * 100) },
                  { label: 'Deals', value: d.count.toLocaleString('en-IN') },
                ]}
              />
            ) : null;
          }}
        />
        <Pie data={rows} dataKey="total" nameKey="key" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="none" isAnimationActive={!reduced}>
          {rows.map((r, i) => <Cell key={r.key} fill={PALETTE[(i + 2) % PALETTE.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Monthly history (solid) and the straight-line 12-month projection (dashed), from the API's forecast. */
export function ForecastLine({ forecast, reduced }: { forecast: FundingForecast; reduced: boolean }) {
  const hist = forecast.historyLabels.map((label, i) => ({ label, actual: forecast.historyValues[i], projected: null as number | null }));
  if (hist.length) hist[hist.length - 1].projected = hist[hist.length - 1].actual; // join the two lines
  const proj = forecast.forecastLabels.map((label, i) => ({ label, actual: null as number | null, projected: forecast.forecastValues[i] }));
  const data = [...hist, ...proj];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="#F0EEF2" />
        <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatUsdMn(v)} width={64} />
        <Tooltip
          content={({ active, payload }: TipArgs<{ label: string; actual: number | null; projected: number | null }>) => {
            const d = active ? payload?.[0]?.payload : undefined;
            if (!d) return null;
            const isActual = d.actual !== null;
            return <TipCard title={d.label} rows={[{ label: isActual ? 'Funding' : 'Projected', value: formatUsdMn(isActual ? d.actual : d.projected) }]} />;
          }}
        />
        <Line dataKey="actual" stroke="#E01552" strokeWidth={2.25} dot={false} connectNulls={false} isAnimationActive={!reduced} />
        <Line dataKey="projected" stroke="#9C99A6" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={!reduced} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
