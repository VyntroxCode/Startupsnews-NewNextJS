"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  // Never actually changes after the initial client read, so there is nothing to subscribe to.
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * True once this render is happening on the client — false during SSR and the first client
 * render, so hydration always matches, then flips true for every render after.
 *
 * Replaces the `useState(false)` + `useEffect(() => setMounted(true), [])` pattern: that version
 * calls `setState` synchronously as the first thing an effect does, which triggers React's
 * "avoid calling setState() directly within an effect" lint rule — an extra, avoidable render
 * pass for what is really just a constant that differs between server and client.
 * `useSyncExternalStore` reads that constant directly instead of rendering once, then
 * re-rendering to update it.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
