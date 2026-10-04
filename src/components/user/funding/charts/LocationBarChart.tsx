'use client';

import { Bar } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { barsHeight, GRID, moneyTick, useChartFont } from './setup';

/** Market › By location: horizontal bars per country, by $ raised or number of rounds. */
export default function LocationBarChart({ rows, metric }: { rows: AggRow[]; metric: 'amount' | 'count' }) {
  const { ref, font } = useChartFont();
  return (
    <ChartBox height={barsHeight(rows.length)} boxRef={ref} empty={!rows.length} emptyText="No data">
      <Bar
        data={{
          labels: rows.map((r) => r.key),
          datasets: [{ data: rows.map((r) => (metric === 'amount' ? r.total : r.count)), backgroundColor: '#5B4FE0', borderRadius: 5, maxBarThickness: 34 }],
        }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => ` ${metric === 'amount' ? formatUsdMn(c.parsed.x) : `${c.parsed.x} rounds`}` } },
          },
          scales: {
            x: { grid: { color: GRID }, ticks: { font, callback: (v) => (metric === 'amount' ? moneyTick(v) : v) } },
            y: { grid: { display: false }, ticks: { font } },
          },
        }}
      />
    </ChartBox>
  );
}
