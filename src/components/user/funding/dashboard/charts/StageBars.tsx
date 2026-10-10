'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useHighlight } from '../highlight';
import { PALETTE } from '../../ui';
import { AG_DIM_OTHERS, AG_TOOLTIP_POSITION, AG_WRAP, GRID_STROKE, agTheme, useAgFont } from './agSetup';

/**
 * Capital by round stage — horizontal bars, largest first. Tapping a bar selects that stage across
 * the Sankey and heatmap; a stage selected elsewhere dims the other bars here (AG itemStyler).
 */
export default function StageBars({ rows }: { rows: AggRow[] }) {
  const { ref, family } = useAgFont();
  const { hl, toggle } = useHighlight();
  const activeStage = hl?.kind === 'stage' ? hl.key : null;

  const options = useMemo<AgCartesianChartOptions>(() => {
    // One colour per stage, by rank, from the shared funding palette.
    const data = rows.map((r, i) => ({ stage: r.key, total: r.total, count: r.count, avg: r.count ? r.total / r.count : 0, colour: PALETTE[i % PALETTE.length] }));
    return {
      theme: agTheme(family),
      data,
      background: { fill: 'transparent' },
      padding: { top: 0, right: 8, bottom: 0, left: 0 },
      legend: { enabled: false },
      tooltip: { position: AG_TOOLTIP_POSITION },
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'stage',
          yKey: 'total',
          yName: 'Funding',
          fill: '#E01552',
          cornerRadius: 6,
          // Each bar keeps its own colour. Hovered bar: solid with a dark outline; a stage selected
          // elsewhere leaves the other bars washed out.
          itemStyler: ({ datum, highlightState }: { datum: { stage: string; colour: string }; highlightState?: string }) => {
            const hovered = highlightState === 'highlighted-item';
            return {
              fill: datum.colour,
              fillOpacity: hovered ? 1 : !activeStage || datum.stage === activeStage ? 0.88 : 0.22,
              stroke: hovered ? '#15131A' : datum.colour,
              strokeWidth: hovered ? 1.5 : 0,
            };
          },
          highlight: { unhighlightedItem: AG_DIM_OTHERS },
          label: {
            enabled: true,
            placement: 'outside-end',
            color: '#15131A',
            fontSize: 11.5,
            fontWeight: 600,
            formatter: ({ datum }: { datum: (typeof data)[number] }) => `${formatUsdMn(datum.total)} · ${datum.count} ${datum.count === 1 ? 'deal' : 'deals'}`,
          },
          tooltip: {
            renderer: ({ datum }: { datum: (typeof data)[number] }) => ({
              heading: datum.stage,
              data: [
                { label: 'Funding', value: formatUsdMn(datum.total) },
                { label: 'Deals', value: datum.count.toLocaleString('en-IN') },
                { label: 'Avg. Round', value: formatUsdMn(datum.avg) },
              ],
            }),
          },
          listeners: {
            seriesNodeClick: ({ datum }: { datum: { stage: string } }) => toggle({ kind: 'stage', key: datum.stage }),
          },
        },
      ],
      axes: {
        x: { type: 'category', position: 'left', line: { enabled: false }, label: { color: '#15131A', fontSize: 12, fontWeight: 600 } },
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
    <div ref={ref} className={`${AG_WRAP} cursor-pointer`}>
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
