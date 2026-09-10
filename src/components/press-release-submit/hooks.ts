"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion as useMotionReducedMotion } from "motion/react";

const neverChanges = () => () => {};

/** False on the server and on the first client render, true from hydration onwards — the standard
 * useSyncExternalStore hydration probe. */
function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, () => true, () => false);
}

/** `prefers-reduced-motion`, but never before hydration.
 *
 * Motion's own `useReducedMotion` reports the real preference on the very first client render
 * while the server always rendered `false`, so branching on it directly — an `initial` that
 * becomes `false`, a wrapper that disappears — makes the first client tree disagree with the
 * server's HTML and React throws a hydration error at anyone who has the preference set. Holding
 * the value at `false` until hydration finishes keeps that first render identical to the server's;
 * React then re-renders with the real preference and every reduced-motion path applies as normal.
 *
 * Every component on this page reads the preference through here rather than from Motion directly.
 * This deliberately mirrors feature-startup/hooks.ts rather than importing from it — the two pages
 * are independent feature folders, and the hook is four lines of logic around one Motion call. */
export function useReducedMotion(): boolean {
  const reduced = useMotionReducedMotion();
  const hydrated = useHydrated();
  return hydrated && !!reduced;
}
