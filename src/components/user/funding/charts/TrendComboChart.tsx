'use client';

import { Chart } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { TimeBucket } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { GRID, legend, moneyTick, useChartFont } from './setup';

/** Pinned overview chart — preview renderTrend(): deal-count bars (right axis) + funding line (left axis). */
export default function TrendComboChart({ buckets }: { buckets: TimeBucket[] }) {
  const { ref, font } = useChartFont();
  const counts = buckets.map((b) => b.count);
  return (
    <ChartBox tall boxRef={ref} empty={!buckets.length}>
      <Chart
        type="bar"
        data={{
          labels: buckets.map((b) => b.label),
          datasets: [
            { type: 'bar' as const, label: 'Deals', data: counts, backgroundColor: '#FBE0E9', borderRadius: 4, yAxisID: 'y1', order: 2 },
            {
              type: 'line' as const,
              label: 'Funding ($Mn)',
              data: buckets.map((b) => b.total),
              borderColor: '#E01552',
              backgroundColor: '#E01552',
              tension: 0.35,
              pointRadius: 3,
              pointBackgroundColor: '#E01552',
              yAxisID: 'y',
              order: 1,
              fill: false,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: legend(font, 'top', 'end'),
            tooltip: {
              callbacks: {
                title: (items) => items[0]?.label ?? '',
                label: (c) =>
                  c.dataset.label === 'Funding ($Mn)'
                    ? ` Funding: ${formatUsdMn(c.parsed.y)}  ·  Deals: ${counts[c.dataIndex]}`
                    : undefined,
              },
              filter: (item) => item.dataset.label === 'Funding ($Mn)',
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font } },
            y: { position: 'left', grid: { color: GRID }, ticks: { font, callback: moneyTick }, title: { display: true, text: 'Funding', font } },
            y1: { position: 'right', grid: { display: false }, ticks: { font, precision: 0 }, title: { display: true, text: 'Deals', font } },
          },
        }}
      />
    </ChartBox>
  );
}
