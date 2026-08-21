'use client';

import { useEffect } from 'react';

interface StoredDraft<T> { savedAt: number; data: T; }

/** Reads a previously auto-saved form draft, if any — call on mount to offer restoring it. */
export function loadFormDraft<T>(key: string): StoredDraft<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredDraft<T>) : null;
  } catch {
    return null;
  }
}

/** Removes a saved draft — call once the form has actually been submitted successfully. */
export function clearFormDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/**
 * Silently persists `data` to localStorage under `key` as soon as `completionRatio` (0-1) is
 * above `threshold` (default 0 — i.e. the moment anything at all has been filled in), debounced
 * so it doesn't write on every keystroke. Purely a client-side safety net against an accidental
 * navigate-away or closed tab mid-form — nothing is sent to the server, no draft post is
 * created. Pair with loadFormDraft(key) on mount (offer restoring) and clearFormDraft(key) on
 * successful submit.
 */
export function useFormDraftAutosave<T>(key: string, data: T, completionRatio: number, threshold = 0): void {
  useEffect(() => {
    if (completionRatio <= threshold) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        // Storage full/unavailable — best-effort safety net only, fail silently.
      }
    }, 800);
    return () => clearTimeout(t);
  }, [key, data, completionRatio, threshold]);
}
