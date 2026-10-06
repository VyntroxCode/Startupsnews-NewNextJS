'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useHighlight } from '../highlight';
import { GRID_STROKE, agTheme, useAgFont } from './agSetup';

/**
 * Capital by round stage — horizontal bars, largest first. Tapping a bar selects that stage across
 * the Sankey and heatmap; a stage selected elsewhere dims the other bars here (AG itemStyler).
 */
export default function StageBars({ rows }: { rows: AggRow[] }) {
  const { ref, family } = useAgFont();
  const { hl, toggle } = useHighlight();
  const activeStage = hl?.kind === 'stage' ? hl.key : null;

  const options = useMemo<AgCartesianChartOptions>(() => {
    const data = rows.map((r) => ({ stage: r.key, total: r.total, count: r.count, avg: r.count ? r.total / r.count : 0 }));
    return {
      theme: agTheme(family),
      data,
      background: { fill: 'transparent' },
      padding: { top: 0, right: 8, bottom: 0, left: 0 },
      legend: { enabled: false },
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'stage',
          yKey: 'total',
          yName: 'Funding',
          fill: '#E01552',
          cornerRadius: 4,
          itemStyler: ({ datum }: { datum: { stage: string } }) => ({
            fill: !activeStage || datum.stage === activeStage ? '#E01552' : '#F6D3DF',
          }),
          label: {
            enabled: true,
            placement: 'outside-end',
            color: '#5A5763',
            fontSize: 10.5,
            formatter: ({ datum }: { datum: (typeof data)[number] }) => `${formatUsdMn(datum.total)} · ${datum.count}`,
          },
          tooltip: {
            renderer: ({ datum }: { datum: (typeof data)[number] }) => ({
              heading: datum.stage,
              data: [
                { label: 'Funding', value: formatUsdMn(datum.total) },
                { label: 'Deals', value: datum.count.toLocaleString('en-IN') },
                { label: 'Avg. round', value: formatUsdMn(datum.avg) },
              ],
            }),
          },
          listeners: {
            seriesNodeClick: ({ datum }: { datum: { stage: string } }) => toggle({ kind: 'stage', key: datum.stage }),
          },
        },
      ],
      axes: {
        x: { type: 'category', position: 'left', line: { enabled: false }, label: { color: '#15131A', fontSize: 11.5 } },
        y: {
          type: 'number',
          position: 'bottom',
          gridLine: { style: [{ stroke: GRID_STROKE }] },
          label: { color: '#9C99A6', formatter: ({ value }: { value: number }) => formatUsdMn(value) },
        },
      },
    } as AgCartesianChartOptions;
  }, [rows, family, activeStage, toggle]);

  return (
    <div ref={ref} className="h-full w-full cursor-pointer font-(family-name:--font-db-inter)">
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
