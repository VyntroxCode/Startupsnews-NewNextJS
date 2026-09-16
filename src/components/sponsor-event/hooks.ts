"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useReducedMotion as useMotionReducedMotion } from "motion/react";

const neverChanges = () => () => {};

/** False on the server and on the first client render, true from hydration onwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, () => true, () => false);
}

/** `prefers-reduced-motion`, but never before hydration.
 *
 * Motion's own hook reports the real preference on the first client render while the server
 * always rendered `false`, so branching on it directly — dropping a wrapper element, flipping an
 * `initial` to `false` — makes that first client tree disagree with the server HTML and React
 * throws a hydration error at exactly the people who set the preference. Holding it at `false`
 * until hydration completes keeps the first render identical to the server's; React then
 * re-renders with the real value and every reduced-motion path applies normally.
 *
 * Every component on this page reads the preference through here, never from Motion directly. */
export function useReducedMotion(): boolean {
  const reduced = useMotionReducedMotion();
  return useHydrated() && !!reduced;
}

/** A media query as a hydration-safe boolean: false on the server and on the first client
 * render, then the real value. Below-the-fold layouts that switch on it (the pinned gallery, the
 * network graph's geometry) therefore render their mobile shape first and settle a frame later,
 * which never shows because none of them is on screen at load. */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** True only on a device that can actually drive a hover / magnetic effect. */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/** The desktop layout — the only place the scroll-pinned and scroll-scattered compositions run.
 * Below it every section falls back to a plain stacked or swipeable layout. */
export function useWideScreen(): boolean {
  return useMediaQuery("(min-width: 960px)");
}
