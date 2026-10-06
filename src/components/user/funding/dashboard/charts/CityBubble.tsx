'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { CityPoint } from '../selectors';
import { GRID_STROKE, agTheme, useAgFont } from './agSetup';

/**
 * Cities as bubbles: across = number of deals, up = average round size, bubble = total $.
 * Top-right = big and busy; top-left = few but large cheques; bottom-right = many small rounds.
 * Only the `labelled` largest cities carry a name so the plot stays readable.
 */
export default function CityBubble({ points, labelled }: { points: CityPoint[]; labelled: number }) {
  const { ref, family } = useAgFont();

  const options = useMemo<AgCartesianChartOptions>(() => {
    const named = new Set([...points].sort((a, b) => b.total - a.total).slice(0, labelled).map((p) => p.city));
    const data = points.map((p) => ({ ...p, tag: named.has(p.city) ? p.city : '' }));
    return {
      theme: agTheme(family),
      data,
      background: { fill: 'transparent' },
      padding: { top: 12, right: 12, bottom: 0, left: 0 },
      legend: { enabled: false },
      series: [
        {
          type: 'bubble',
          xKey: 'deals',
          xName: 'Deals',
          yKey: 'avg',
          yName: 'Avg. round',
          sizeKey: 'total',
          sizeName: 'Funding',
          labelKey: 'tag',
          minSize: 8,
          maxSize: 46,
          fill: '#E01552',
          fillOpacity: 0.22,
          stroke: '#E01552',
          strokeWidth: 1.25,
          label: { enabled: true, color: '#15131A', fontSize: 10.5, fontWeight: 600 },
          tooltip: {
            renderer: ({ datum }: { datum: CityPoint }) => ({
              heading: datum.city,
              data: [
                { label: 'Funding', value: formatUsdMn(datum.total) },
                { label: 'Deals', value: datum.deals.toLocaleString('en-IN') },
                { label: 'Avg. round', value: formatUsdMn(datum.avg) },
              ],
            }),
          },
        },
      ],
      axes: {
        x: {
          type: 'number',
          position: 'bottom',
          gridLine: { enabled: false },
          title: { text: 'Deals →', color: '#9C99A6', fontSize: 10.5 },
          label: { color: '#9C99A6' },
        },
        y: {
          type: 'number',
          position: 'left',
          gridLine: { style: [{ stroke: GRID_STROKE }] },
          title: { text: 'Avg. round size →', color: '#9C99A6', fontSize: 10.5 },
          label: { color: '#9C99A6', formatter: ({ value }: { value: number }) => formatUsdMn(value) },
        },
      },
    } as AgCartesianChartOptions;
  }, [points, labelled, family]);

  return (
    <div ref={ref} className="h-full w-full font-(family-name:--font-db-inter)">
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
