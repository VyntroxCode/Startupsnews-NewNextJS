'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import type { TimeBucket } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { AG_DIM_OTHERS, AG_TOOLTIP_POSITION, AG_WRAP, GRID_STROKE, PINK_DARK, agTheme, useAgFont } from './agSetup';

/**
 * Funding trend: $ as a pink area (left axis) + deal count as quiet bars (right axis).
 * `compact` (phones) drops the bars and second axis — deals stay in the tooltip.
 */
export default function TrendChart({ buckets, compact }: { buckets: TimeBucket[]; compact: boolean }) {
  const { ref, family } = useAgFont();

  const options = useMemo<AgCartesianChartOptions>(() => {
    const data = buckets.map((b) => ({ label: b.label, total: b.total, count: b.count }));
    type Datum = (typeof data)[number];
    // The tooltip is shared, so each series contributes its own rows — the bars carry Deals, the
    // area carries Funding and Avg. Round (and Deals too on phones, where there are no bars).
    const dealsRow = (d: Datum) => ({ label: 'Deals', value: d.count.toLocaleString('en-IN') });
    const dealsTooltip = { renderer: ({ datum }: { datum: Datum }) => ({ heading: datum.label, data: [dealsRow(datum)] }) };
    const fundingTooltip = {
      renderer: ({ datum }: { datum: Datum }) => ({
        heading: datum.label,
        data: [
          { label: 'Funding', value: formatUsdMn(datum.total) },
          ...(compact ? [dealsRow(datum)] : []),
          { label: 'Avg. Round', value: datum.count ? formatUsdMn(datum.total / datum.count) : '—' },
        ],
      }),
    };
    return {
      theme: agTheme(family),
      data,
      background: { fill: 'transparent' },
      padding: { top: 8, right: 4, bottom: 0, left: 0 },
      legend: { enabled: !compact, position: 'top', item: { marker: { shape: 'square', size: 9 } } },
      tooltip: { mode: 'shared', position: AG_TOOLTIP_POSITION },
      series: [
        ...(compact
          ? []
          : [{
              type: 'bar' as const,
              xKey: 'label',
              yKey: 'count',
              yName: 'Deals',
              yKeyAxis: 'deals',
              fill: '#F6D3DF',
              fillOpacity: 0.7,
              cornerRadius: 3,
              highlight: { highlightedItem: { fill: '#E88BAA', fillOpacity: 1 }, unhighlightedItem: AG_DIM_OTHERS },
              tooltip: dealsTooltip,
            }]),
        {
          type: 'area' as const,
          xKey: 'label',
          yKey: 'total',
          yName: 'Funding',
          fill: '#E01552',
          fillOpacity: 0.1,
          stroke: '#E01552',
          strokeWidth: 2.25,
          interpolation: { type: 'smooth' as const },
          marker: { enabled: buckets.length <= 20, size: 6, fill: '#FFFFFF', stroke: '#E01552', strokeWidth: 2 },
          highlight: { highlightedItem: { fill: PINK_DARK, stroke: PINK_DARK }, unhighlightedItem: AG_DIM_OTHERS },
          tooltip: fundingTooltip,
        },
      ],
      axes: {
        x: { type: 'category', position: 'bottom', line: { enabled: false }, label: { color: '#9C99A6', autoRotate: true } },
        y: {
          type: 'number',
          position: 'left',
          gridLine: { style: [{ stroke: GRID_STROKE }] },
          label: { color: '#9C99A6', formatter: ({ value }: { value: number }) => formatUsdMn(value) },
        },
        ...(compact
          ? {}
          : {
              deals: {
                type: 'number' as const,
                position: 'right' as const,
                gridLine: { enabled: false },
                label: { color: '#C9C5CF' },
                title: { text: 'Deals', color: '#9C99A6', fontSize: 10 },
              },
            }),
      },
    } as AgCartesianChartOptions;
  }, [buckets, compact, family]);

  return (
    <div ref={ref} className={AG_WRAP}>
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
