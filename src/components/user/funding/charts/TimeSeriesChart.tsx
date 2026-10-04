'use client';

import { Bar } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { MarketTimeSeries } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { GRID, legend, moneyTick, useChartFont } from './setup';

const BAND_COLORS = ['#A7D8B0', '#5FB876', '#2E8B4E', '#B98A2E', '#8A5D14'];

/** Market › Time series: funding per bucket, stacked by round-size band. */
export default function TimeSeriesChart({ series }: { series: MarketTimeSeries }) {
  const { ref, font } = useChartFont();
  return (
    <ChartBox tall boxRef={ref} empty={!series.labels.length} emptyText="No data for this selection">
      <Bar
        data={{
          labels: series.labels,
          datasets: series.bands.map((b, i) => ({
            label: `${b.label} (${b.range})`,
            data: b.values,
            backgroundColor: BAND_COLORS[i],
            stack: 's1',
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: legend(font, 'bottom'),
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatUsdMn(c.parsed.y)}` } },
          },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font } },
            y: { stacked: true, grid: { color: GRID }, ticks: { font, callback: moneyTick } },
          },
        }}
      />
    </ChartBox>
  );
}
