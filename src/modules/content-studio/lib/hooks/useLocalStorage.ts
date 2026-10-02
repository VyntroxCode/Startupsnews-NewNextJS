"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getParsed, isStorageBlocked, setRaw, subscribe } from "@/modules/content-studio/lib/storage";
import { useHydrated } from "./useHydrated";

export interface StorageMeta {
  /** False on the server and on the first client render; true once mounted. */
  hydrated: boolean;
  /** True when localStorage is unavailable (private mode, blocked site data). */
  blocked: boolean;
}

/**
 * SSR-safe localStorage binding.
 *
 * Hydration safety comes from `getServerSnapshot` (the third argument): it
 * returns `fallback`, so the server HTML and the *first* client render are
 * identical by construction and React's hydration diff is clean. Only after
 * hydration commits does React call `getSnapshot`, read real storage, and
 * re-render. That is a stronger guarantee than the usual
 * useEffect-then-setState pattern, which relies on the effect not running
 * during hydration.
 *
 * `getParsed` memoises on the raw string so the snapshot reference stays
 * stable — without that, React throws "The result of getSnapshot should be
 * cached" and loops.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | null,
): [T, (next: T) => void, StorageMeta] {
  const getSnapshot = useCallback(
    () => getParsed<T>(key, fallback, parse),
    [key, fallback, parse],
  );

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const subscribeToKey = useCallback(
    (onChange: () => void) => subscribe(key, onChange),
    [key],
  );

  const value = useSyncExternalStore(subscribeToKey, getSnapshot, getServerSnapshot);

  const hydrated = useHydrated();

  const set = useCallback(
    (next: T) => {
      try {
        setRaw(key, JSON.stringify(next));
      } catch {
        /* quota or serialisation failure — value stays in memory only */
      }
    },
    [key],
  );

  return [value, set, { hydrated, blocked: hydrated && isStorageBlocked() }];
}

/** Parser for a JSON array, with an optional per-item guard. */
export function parseArray<T>(guard?: (v: unknown) => v is T) {
  return (raw: string): T[] | null => {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    return guard ? v.filter(guard) : (v as T[]);
  };
}

/** Parser for a plain stored string (the value is not JSON-encoded). */
export function parseString(raw: string): string {
  return raw;
}
