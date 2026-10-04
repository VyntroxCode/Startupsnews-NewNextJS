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
} from 'chart.js';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';

// Registered once for every Funding chart (tree-shaken Chart.js — only what the preview uses).
ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

/** Gridline colour used by every chart in the preview. */
export const GRID = '#F0EEF2';

export const moneyTick = (v: string | number) => formatUsdMn(Number(v));

/**
 * The preview sets Chart.js fonts to Inter 11px. next/font renames the family (e.g. "__inter_ab12"),
 * so the chart reads the wrapper's computed font-family instead of hard-coding "Inter".
 * Returns a ref for the wrapper and the font object to pass into options.
 */
export function useChartFont() {
  const ref = useRef<HTMLDivElement>(null);
  const [family, setFamily] = useState('Inter, system-ui, sans-serif');
  useEffect(() => {
    if (ref.current) setFamily(getComputedStyle(ref.current).fontFamily || family);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
  }, []);
  return { ref, font: { family, size: 11 } };
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
