'use client';

import { useEffect, useRef, useState } from 'react';
import { AllCartesianModule, ModuleRegistry, type AgChartThemeParams, type AgTooltipPositionOptions } from 'ag-charts-community';

// AG Charts 14 ships features as modules. Community cartesian (bar, area, line, bubble) is all this
// dashboard uses — Treemap/Heatmap/Sankey are Enterprise-only, so those are drawn with Recharts.
ModuleRegistry.registerModules([AllCartesianModule]);

/**
 * AG draws on canvas, so it can't inherit the page font. next/font renames families
 * (e.g. "__carlito_ab12"), so read the wrapper's computed font-family instead of hard-coding it.
 */
export function useAgFont() {
  const ref = useRef<HTMLDivElement>(null);
  const [family, setFamily] = useState('Calibri, Carlito, Arial, sans-serif');
  useEffect(() => {
    const f = ref.current ? getComputedStyle(ref.current).fontFamily : '';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the rendered font once on mount
    if (f) setFamily(f);
  }, []);
  return { ref, family };
}

/** StartupNews funding palette for AG's chrome: ink text, soft grid, white tooltip. */
export function agTheme(fontFamily: string): { baseTheme: 'ag-default'; params: AgChartThemeParams } {
  return {
    baseTheme: 'ag-default',
    params: {
      fontFamily,
      fontSize: 12,
      foregroundColor: '#15131A',
      textColor: '#15131A',
      subtleTextColor: '#9C99A6',
      backgroundColor: '#FFFFFF',
      chartBackgroundColor: '#FFFFFF',
      axisLineColor: '#EBE8ED',
      tooltipBackgroundColor: '#FFFFFF',
      tooltipTextColor: '#15131A',
      tooltipSubtleTextColor: '#5A5763',
      tooltipBorderRadius: 8,
      chartPadding: 4,
    },
  };
}

export const GRID_STROKE = '#F0EEF2';

/**
 * Wrapper classes for every AG chart. `overflow-y-auto` is load-bearing, not cosmetic: AG walks up
 * from the chart to the first `overflow-y: auto|scroll` ancestor and clamps the tooltip anchor to
 * that element's box. Without a nearer one it finds <html> (globals.css: `overflow-y: auto;
 * height: 100%`), whose box is only one viewport tall and scrolls away, so once the page is
 * scrolled the anchor clamps to nothing and the tooltip is pinned to the viewport's top-left
 * corner. The chart fills the wrapper exactly, so it never actually scrolls.
 */
export const AG_WRAP = 'h-full w-full overflow-y-auto [scrollbar-width:none]';

/** Tooltip sits just above the hovered bar / point / bubble (below it when there is no room). */
export const AG_TOOLTIP_POSITION: AgTooltipPositionOptions = { anchorTo: 'node', placement: ['top', 'bottom'] };

/** Hover: every other item in the series fades back so the hovered one stands out. */
export const AG_DIM_OTHERS = { opacity: 0.35 };

export const PINK_DARK = '#A80F3E';
