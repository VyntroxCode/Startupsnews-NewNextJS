'use client';

import { Line } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { MarketHeadToHead } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { GRID, legend, moneyTick, useChartFont } from './setup';

/** Market › Head to head: yearly capital for two countries. */
export default function HeadToHeadChart({ data }: { data: MarketHeadToHead }) {
  const { ref, font } = useChartFont();
  return (
    <ChartBox tall boxRef={ref} empty={!data.years.length} emptyText="No data yet">
      <Line
        data={{
          labels: data.years,
          datasets: [
            { label: data.a.name, data: data.a.totals, borderColor: '#5B4FE0', backgroundColor: 'rgba(91,79,224,.08)', fill: true, tension: 0.25, pointRadius: 3 },
            { label: data.b.name, data: data.b.totals, borderColor: '#D98E2B', backgroundColor: 'rgba(217,142,43,.08)', fill: true, tension: 0.25, pointRadius: 3 },
          ],
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
