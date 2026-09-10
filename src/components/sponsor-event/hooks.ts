"use client";

import { useSyncExternalStore } from "react";
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

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

function subscribeToPointer(onChange: () => void) {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True only on a device that can actually drive a hover/tilt effect. Used to switch off the
 * pointer-driven card tilt on touch screens, where it is pure cost. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false
  );
}
