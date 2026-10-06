'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Cross-chart highlight: one sector or one round stage at a time. Hovering (or tapping) it in any
 * chart lights it up in the others — treemap, ranking, Sankey, heatmap, stage bars. Each chart
 * draws the highlight itself; this only holds which key is active.
 */
export type Highlight = { kind: 'sector' | 'stage'; key: string } | null;

interface HighlightApi {
  hl: Highlight;
  set: (h: Highlight) => void;
  /** Tap/click: select, or clear if it was already selected. */
  toggle: (h: NonNullable<Highlight>) => void;
}

const Ctx = createContext<HighlightApi>({ hl: null, set: () => {}, toggle: () => {} });

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [hl, setHl] = useState<Highlight>(null);
  const set = useCallback((h: Highlight) => {
    setHl((cur) => (cur?.kind === h?.kind && cur?.key === h?.key ? cur : h));
  }, []);
  const toggle = useCallback((h: NonNullable<Highlight>) => {
    setHl((cur) => (cur?.kind === h.kind && cur.key === h.key ? null : h));
  }, []);
  const value = useMemo(() => ({ hl, set, toggle }), [hl, set, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHighlight(): HighlightApi {
  return useContext(Ctx);
}

/** 'on' = this item is highlighted, 'off' = another item of the same kind is, 'none' = nothing is. */
export function hlState(hl: Highlight, kind: 'sector' | 'stage', key: string): 'on' | 'off' | 'none' {
  if (!hl || hl.kind !== kind) return 'none';
  return hl.key === key ? 'on' : 'off';
}

/** Hover/focus/tap handlers for a DOM element that represents one sector or stage. */
export function hlProps(api: HighlightApi, kind: 'sector' | 'stage', key: string) {
  return {
    onMouseEnter: () => api.set({ kind, key }),
    onMouseLeave: () => api.set(null),
    onFocus: () => api.set({ kind, key }),
    onBlur: () => api.set(null),
    onClick: () => api.toggle({ kind, key }),
  };
}
