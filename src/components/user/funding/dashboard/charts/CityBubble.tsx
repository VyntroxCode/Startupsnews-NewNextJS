'use client';

import { useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import type { CityPoint } from '../selectors';
import { NEUTRAL } from '../selectors';
import { AG_DIM_OTHERS, AG_TOOLTIP_POSITION, AG_WRAP, GRID_STROKE, agTheme, useAgFont } from './agSetup';

/**
 * Cities as bubbles: across = number of deals, up = average round size, bubble = total $.
 * Top-right = big and busy; top-left = few but large cheques; bottom-right = many small rounds.
 * Only the `labelled` largest cities carry a name so the plot stays readable.
 * `colours` = the leaderboard's city colours (same city, same colour on both cards); every other
 * city is neutral grey. `active` = the city pointed at in the leaderboard; the rest wash out.
 */
type Datum = CityPoint & { tag: string; colour: string };

export default function CityBubble({ points, labelled, colours, active }: { points: CityPoint[]; labelled: number; colours: Map<string, string>; active: string | null }) {
  const { ref, family } = useAgFont();

  const options = useMemo<AgCartesianChartOptions>(() => {
    const named = new Set([...points].sort((a, b) => b.total - a.total).slice(0, labelled).map((p) => p.city));
    // Biggest first, so smaller bubbles are drawn on top of them and stay reachable.
    const data: Datum[] = [...points]
      .sort((a, b) => b.total - a.total)
      .map((p) => ({ ...p, tag: named.has(p.city) ? p.city : '', colour: colours.get(p.city) ?? NEUTRAL }));
    return {
      theme: agTheme(family),
      data,
      background: { fill: 'transparent' },
      padding: { top: 12, right: 12, bottom: 0, left: 0 },
      legend: { enabled: false },
      tooltip: { position: AG_TOOLTIP_POSITION },
      series: [
        {
          type: 'bubble',
          xKey: 'deals',
          xName: 'Deals',
          yKey: 'avg',
          yName: 'Avg. Round',
          sizeKey: 'total',
          sizeName: 'Funding',
          labelKey: 'tag',
          minSize: 8,
          maxSize: 46,
          fill: NEUTRAL,
          stroke: NEUTRAL,
          // Each bubble keeps its city colour. Hovered: solid with a dark outline. A city pointed at
          // in the leaderboard leaves the other bubbles washed out.
          itemStyler: ({ datum, highlightState }: { datum: Datum; highlightState?: string }) => {
            const hovered = highlightState === 'highlighted-item';
            const faded = !!active && datum.city !== active;
            return {
              fill: datum.colour,
              fillOpacity: hovered || datum.city === active ? 0.95 : faded ? 0.12 : datum.colour === NEUTRAL ? 0.45 : 0.7,
              stroke: hovered ? '#15131A' : datum.colour,
              strokeOpacity: faded ? 0.3 : 1,
              strokeWidth: hovered ? 2 : 1.25,
            };
          },
          highlight: { unhighlightedItem: AG_DIM_OTHERS },
          label: { enabled: true, color: '#15131A', fontSize: 11, fontWeight: 700 },
          tooltip: {
            renderer: ({ datum }: { datum: Datum }) => ({
              title: datum.city,
              symbol: { marker: { enabled: true, shape: 'circle', fill: datum.colour, fillOpacity: 1, stroke: datum.colour } },
              data: [
                { label: 'Funding', value: formatUsdMn(datum.total) },
                { label: 'Deals', value: datum.deals.toLocaleString('en-IN') },
                { label: 'Avg. Round', value: formatUsdMn(datum.avg) },
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
          title: { text: 'Number of deals →', color: '#5A5763', fontSize: 11 },
          label: { color: '#5A5763' },
        },
        y: {
          type: 'number',
          position: 'left',
          gridLine: { style: [{ stroke: GRID_STROKE }] },
          title: { text: 'Avg. round size →', color: '#5A5763', fontSize: 11 },
          label: { color: '#5A5763', formatter: ({ value }: { value: number }) => formatUsdMn(value) },
        },
      },
    } as AgCartesianChartOptions;
  }, [points, labelled, colours, active, family]);

  return (
    <div ref={ref} className={AG_WRAP}>
      <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
