'use client';

import { Line } from 'react-chartjs-2';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { FundingForecast } from '@/modules/funding-deals/domain/types';
import ChartBox from './ChartBox';
import { GRID, legend, moneyTick, useChartFont } from './setup';

/** Preview renderForecast(): filled actual line + dashed gold forecast that starts at the last actual point. */
export default function ForecastChart({ forecast }: { forecast: FundingForecast }) {
  const { ref, font } = useChartFont();
  const hist = forecast.historyLabels;
  const fut = forecast.forecastLabels;
  const histData: (number | null)[] = [...forecast.historyValues, ...fut.map(() => null)];
  const futData: (number | null)[] = [
    ...new Array(Math.max(hist.length - 1, 0)).fill(null),
    ...(hist.length ? [forecast.historyValues[forecast.historyValues.length - 1]] : []),
    ...forecast.forecastValues,
  ];
  return (
    <ChartBox boxRef={ref} empty={!hist.length && !fut.length} emptyText="No data yet">
      <Line
        data={{
          labels: [...hist, ...fut],
          datasets: [
            { label: 'Actual', data: histData, borderColor: '#E01552', backgroundColor: 'rgba(224,21,82,.08)', fill: true, tension: 0.3, pointRadius: 3, spanGaps: false },
            { label: 'Forecast', data: futData, borderColor: '#D98E2B', borderDash: [6, 5], backgroundColor: 'rgba(217,142,43,.06)', fill: true, tension: 0.3, pointRadius: 3, spanGaps: false },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: legend(font, 'top', 'end'),
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatUsdMn(c.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font, maxRotation: 45, minRotation: 0 } },
            y: { grid: { color: GRID }, ticks: { font, callback: moneyTick } },
          },
        }}
      />
    </ChartBox>
  );
}
