'use client';

import { Bar } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { MarketGrowthRow } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { barsHeight, GRID, useChartFont } from './setup';

/** Market › By growth: % change in capital between two years, fastest first. */
export default function GrowthChart({ rows }: { rows: MarketGrowthRow[] }) {
  const { ref, font } = useChartFont();
  return (
    <ChartBox height={barsHeight(rows.length)} boxRef={ref} empty={!rows.length} emptyText="Not enough history to compare these years">
      <Bar
        data={{ labels: rows.map((r) => r.country), datasets: [{ data: rows.map((r) => r.pct), backgroundColor: '#0E9D57', borderRadius: 5, maxBarThickness: 34 }] }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => {
                  const r = rows[c.dataIndex];
                  const pct = c.parsed.x ?? 0;
                  return ` ${pct >= 0 ? '+' : ''}${pct}% (${formatUsdMn(r.fromTotal)} → ${formatUsdMn(r.toTotal)})`;
                },
              },
            },
          },
          scales: {
            x: { grid: { color: GRID }, ticks: { font, callback: (v) => `${v}%` } },
            y: { grid: { display: false }, ticks: { font } },
          },
        }}
      />
    </ChartBox>
  );
}
