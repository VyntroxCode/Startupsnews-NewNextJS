'use client';

import { useEffect, useRef, useState } from 'react';
import { AllCartesianModule, ModuleRegistry, type AgChartThemeParams } from 'ag-charts-community';

// AG Charts 14 ships features as modules. Community cartesian (bar, area, line, bubble) is all this
// dashboard uses — Treemap/Heatmap/Sankey are Enterprise-only, so those are drawn with Recharts.
ModuleRegistry.registerModules([AllCartesianModule]);

/**
 * AG draws on canvas, so it can't inherit the page font. next/font renames families
 * (e.g. "__inter_ab12"), so read the wrapper's computed font-family instead of hard-coding it.
 */
export function useAgFont() {
  const ref = useRef<HTMLDivElement>(null);
  const [family, setFamily] = useState('Inter, system-ui, sans-serif');
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
      fontSize: 11,
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
