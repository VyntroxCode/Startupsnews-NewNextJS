'use client';

import { useSyncExternalStore } from 'react';

function useMedia(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Phones (<640px): charts switch to their compact, intentionally simpler layouts. */
export const useCompact = () => useMedia('(max-width: 639px)');

/** prefers-reduced-motion: chart libraries skip their own animations too. */
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
