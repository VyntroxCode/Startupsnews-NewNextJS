'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from 'chart.js';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';

// Registered once for every Funding chart (tree-shaken Chart.js — only what the preview uses).
/**
 * Hover focus for every Funding Chart.js chart: while something is hovered, the rest fades back.
 * Bars are faded one by one (so in a single-series or stacked chart only the hovered bar stays
 * solid); for lines, the whole series that is not hovered fades. Chart.js already darkens the
 * hovered element itself and redraws whenever the active element changes.
 */
const dimOthers: Plugin = {
  id: 'fiDimOthers',
  beforeDatasetDraw(chart, args) {
    const active = chart.getActiveElements();
    if (!active.length) return;
    const mine = new Set(active.filter((a) => a.datasetIndex === args.index).map((a) => a.index));
    const { ctx } = chart;
    const meta = args.meta as typeof args.meta & { $fiDimmed?: boolean };
    if (meta.type === 'bar') {
      meta.data.forEach((el, i) => {
        ctx.save();
        ctx.globalAlpha = mine.has(i) ? 1 : 0.35;
        (el as unknown as { draw: (c: CanvasRenderingContext2D) => void }).draw(ctx);
        ctx.restore();
      });
      return false; // drawn above, skip the default pass
    }
    if (!mine.size) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      meta.$fiDimmed = true;
    }
  },
  afterDatasetDraw(chart, args) {
    const meta = args.meta as typeof args.meta & { $fiDimmed?: boolean };
    if (meta.$fiDimmed) {
      chart.ctx.restore();
      meta.$fiDimmed = false;
    }
  },
};

ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, dimOthers);

// Tooltip sits centred above the hovered bar / point (Chart.js otherwise puts it to the side).
// Chart.js is only used by the Funding charts, so these defaults do not leak to other pages.
ChartJS.defaults.plugins.tooltip.xAlign = 'center';
ChartJS.defaults.plugins.tooltip.yAlign = 'bottom';

/** Gridline colour used by every chart in the preview. */
export const GRID = '#F0EEF2';

export const moneyTick = (v: string | number) => formatUsdMn(Number(v));

/**
 * Chart.js draws on canvas, so it cannot inherit the page font. next/font renames families (e.g. "__carlito_ab12"),
 * so the chart reads the wrapper's computed font-family (Calibri, see fonts.ts) instead of hard-coding it.
 * Returns a ref for the wrapper and the font object to pass into options.
 */
export function useChartFont() {
  const ref = useRef<HTMLDivElement>(null);
  const [family, setFamily] = useState('Calibri, Carlito, Arial, sans-serif');
  useEffect(() => {
    if (ref.current) setFamily(getComputedStyle(ref.current).fontFamily || family);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
  }, []);
  return { ref, font: { family, size: 12 } };
}

/** Legend config shared by the charts: small square swatches. */
export function legend(font: { family: string; size: number }, position: 'top' | 'bottom', align: 'start' | 'center' | 'end' = 'center') {
  return { position, align, labels: { boxWidth: 10, boxHeight: 10, font } } as const;
}

/** Horizontal bar charts grow with their row count (≈44px a row, 180px minimum) so a single
 * country is a normal bar, not a slab filling the card. */
export function barsHeight(rows: number): number {
  return Math.max(180, rows * 44 + 60);
}
