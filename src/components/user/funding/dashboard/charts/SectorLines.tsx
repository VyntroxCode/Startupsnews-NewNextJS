'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import type { SectorTrend } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useHighlight } from '../highlight';
import { INK, NEUTRAL } from '../selectors';
import { AG_DIM_OTHERS, AG_TOOLTIP_POSITION, AG_WRAP, GRID_STROKE, agTheme, useAgFont } from './agSetup';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The earlier year's line: quiet and dashed, so the current year reads first. */
const PREVIOUS_STROKE = '#9C99A6';

type Row = { month: string } & Record<string, number | null | string>;

/**
 * Capital per month as lines, in two modes:
 *   no `selected` — one line per coloured (top) sector for the current year, in the treemap's
 *                   colours; hovering a tile thickens that sector's line and fades the rest.
 *   `selected`    — that one sector, this year (solid, its colour) against last year (dashed grey),
 *                   Jan → Dec. This year's line stops at the last month reached.
 * Series keys are s0, s1, … rather than sector names: AG reads a dot in a key as a nested path.
 */
export default function SectorLines({ trend, colours, selected, compact }: { trend: SectorTrend; colours: Map<string, string>; selected: string | null; compact: boolean }) {
  const { ref, family } = useAgFont();
  const { hl } = useHighlight();
  const hovered = hl?.kind === 'sector' ? hl.key : null;

  const options = useMemo<AgCartesianChartOptions>(() => {
    const one = selected ? trend.series.find((s) => s.sector === selected) : undefined;
    const money = ({ value }: { value: number }) => formatUsdMn(value);
    const tip = (key: string, label: string) => ({
      renderer: ({ datum }: { datum: Row }) => ({ heading: datum.month, data: [{ label, value: formatUsdMn(datum[key] as number | null) }] }),
    });

    let data: Row[];
    let series: object[];
    if (one) {
      const colour = colours.get(one.sector);
      const stroke = !colour || colour === NEUTRAL ? INK : colour;
      data = MONTHS.map((month, i) => ({ month, cur: one.current[i], prev: one.previous[i] }));
      series = [
        {
          type: 'line',
          xKey: 'month',
          yKey: 'prev',
          yName: String(trend.previousYear),
          stroke: PREVIOUS_STROKE,
          strokeWidth: 2,
          lineDash: [5, 4],
          marker: { enabled: false, fill: PREVIOUS_STROKE },
          highlight: { unhighlightedItem: AG_DIM_OTHERS },
          tooltip: tip('prev', String(trend.previousYear)),
        },
        {
          type: 'line',
          xKey: 'month',
          yKey: 'cur',
          yName: String(trend.year),
          stroke,
          strokeWidth: 2.5,
          marker: { enabled: true, size: 7, fill: '#FFFFFF', stroke, strokeWidth: 2 },
          highlight: { unhighlightedItem: AG_DIM_OTHERS },
          tooltip: tip('cur', String(trend.year)),
        },
      ];
    } else {
      const top = trend.series.filter((s) => (colours.get(s.sector) ?? NEUTRAL) !== NEUTRAL);
      const dim = hovered !== null && top.some((s) => s.sector === hovered);
      data = MONTHS.slice(0, trend.lastMonth).map((month, i) => {
        const row: Row = { month };
        top.forEach((s, n) => { row[`s${n}`] = s.current[i]; });
        return row;
      });
      series = top.map((s, n) => {
        const stroke = colours.get(s.sector)!;
        const on = s.sector === hovered;
        return {
          type: 'line',
          xKey: 'month',
          yKey: `s${n}`,
          yName: s.sector,
          stroke,
          strokeWidth: on ? 3 : 2,
          strokeOpacity: dim && !on ? 0.18 : 1,
          marker: { enabled: false, fill: stroke },
          highlight: { unhighlightedItem: AG_DIM_OTHERS },
          tooltip: tip(`s${n}`, s.sector),
        };
      });
    }

    return {
      theme: agTheme(family),
      data,
      background: { fill: 'transparent' },
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
      legend: { enabled: true, position: one ? 'top' : 'bottom', item: { marker: { shape: 'square', size: 9 }, label: { fontSize: compact ? 11 : 12 } } },
      tooltip: { mode: 'shared', position: AG_TOOLTIP_POSITION },
      series,
      axes: {
        x: { type: 'category', position: 'bottom', line: { enabled: false }, label: { color: '#9C99A6', autoRotate: true } },
        y: { type: 'number', position: 'left', min: 0, gridLine: { style: [{ stroke: GRID_STROKE }] }, label: { color: '#9C99A6', formatter: money } },
      },
    } as AgCartesianChartOptions;
  }, [trend, colours, selected, hovered, compact, family]);

  return (
    <div ref={ref} className={AG_WRAP}>
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
