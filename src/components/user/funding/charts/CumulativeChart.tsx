'use client';

import { Line } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { MarketCumulative } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { GRID, legend, moneyTick, useChartFont } from './setup';

const LINE_COLORS = ['#C9C6D1', '#B98A2E', '#5FB876', '#5B4FE0', '#E01552'];

/** Market › Cumulative race: running total since Jan 1, one line per year; this year bold pink. */
export default function CumulativeChart({ data }: { data: MarketCumulative }) {
  const { ref, font } = useChartFont();
  return (
    <ChartBox tall boxRef={ref} empty={!data.series.length} emptyText="No data for this selection">
      <Line
        data={{
          labels: data.months,
          datasets: data.series.map((s, i) => {
            const current = s.year === data.currentYear;
            return {
              label: s.year,
              data: s.values,
              borderColor: current ? '#E01552' : LINE_COLORS[i % LINE_COLORS.length],
              backgroundColor: 'transparent',
              borderWidth: current ? 3 : 1.5,
              pointRadius: 0,
              tension: 0.15,
            };
          }),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: legend(font, 'bottom'),
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatUsdMn(c.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font } },
            y: { grid: { color: GRID }, ticks: { font, callback: moneyTick } },
          },
        }}
      />
    </ChartBox>
  );
}
