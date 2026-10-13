'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { NEUTRAL } from '../selectors';
import { AG_DIM_OTHERS, AG_TOOLTIP_POSITION, AG_WRAP, GRID_STROKE, agTheme, useAgFont } from './agSetup';

type Datum = { model: string; avg: number; total: number; count: number; colour: string };

/**
 * Average round size per business model — horizontal bars, biggest cheque first. The companion to
 * the Business Models donut: the donut says where the money went, this says how big each round was.
 * `colours` are the donut's (same model, same colour); `active` is the model pointed at on the
 * donut or its key, which washes out the other bars here. (One-way: AG Community has no per-bar
 * hover event to report back, so hovering a bar highlights it on this card only.)
 */
export default function ModelBars({ rows, colours, active }: { rows: AggRow[]; colours: Map<string, string>; active: string | null }) {
  const { ref, family } = useAgFont();

  const options = useMemo<AgCartesianChartOptions>(() => {
    const data: Datum[] = rows
      .filter((r) => r.count > 0)
      .map((r) => ({ model: r.key, avg: Math.round((r.total / r.count) * 10) / 10, total: r.total, count: r.count, colour: colours.get(r.key) ?? NEUTRAL }))
      .sort((a, b) => b.avg - a.avg);
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
          xKey: 'model',
          yKey: 'avg',
          yName: 'Avg. Round',
          fill: NEUTRAL,
          cornerRadius: 6,
          itemStyler: ({ datum, highlightState }: { datum: Datum; highlightState?: string }) => {
            const hovered = highlightState === 'highlighted-item';
            return {
              fill: datum.colour,
              fillOpacity: hovered ? 1 : !active || datum.model === active ? 0.88 : 0.22,
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
            formatter: ({ datum }: { datum: Datum }) => `${formatUsdMn(datum.avg)} · ${datum.count} ${datum.count === 1 ? 'deal' : 'deals'}`,
          },
          tooltip: {
            renderer: ({ datum }: { datum: Datum }) => ({
              heading: datum.model,
              data: [
                { label: 'Avg. Round', value: formatUsdMn(datum.avg) },
                { label: 'Deals', value: datum.count.toLocaleString('en-IN') },
                { label: 'Funding', value: formatUsdMn(datum.total) },
              ],
            }),
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
  }, [rows, colours, active, family]);

  return (
    <div ref={ref} className={AG_WRAP}>
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
