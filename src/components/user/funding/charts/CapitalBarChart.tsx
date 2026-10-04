'use client';

import { Bar } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import ChartBox from './ChartBox';
import { GRID, moneyTick, useChartFont } from './setup';

/** Preview renderBarChart(): one colour, rounded bars, $ axis. Used for Market › Overview "Capital raised". */
export default function CapitalBarChart({ labels, data, color = '#5B4FE0' }: { labels: string[]; data: number[]; color?: string }) {
  const { ref, font } = useChartFont();
  return (
    <ChartBox boxRef={ref} empty={!labels.length} emptyText="No data">
      <Bar
        data={{ labels, datasets: [{ data, backgroundColor: color, borderRadius: 5, maxBarThickness: 34 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${formatUsdMn(c.parsed.y)}` } } },
          scales: {
            x: { grid: { display: false }, ticks: { font } },
            y: { grid: { color: GRID }, ticks: { font, callback: moneyTick } },
          },
        }}
      />
    </ChartBox>
  );
}
