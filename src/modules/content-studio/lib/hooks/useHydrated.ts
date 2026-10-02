"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False during SSR and the first client render, true once hydrated.
 *
 * Uses useSyncExternalStore rather than useEffect(() => setState(true)): same
 * result, but without a setState inside an effect, which triggers a cascading
 * render (and React's `set-state-in-effect` lint rule).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
