'use client';

import { useEffect } from 'react';

/**
 * Calls `onClose` when the Escape key is pressed — the standard "press Esc to close" behavior
 * for modals/dialogs/popups. Safe to call unconditionally in a component that's only ever
 * mounted while its modal is open (the listener is attached/removed with the component's own
 * lifecycle); for a component that stays mounted with its modal toggled by state, pass
 * `enabled` so the listener isn't live while the modal is actually closed.
 */
export function useEscapeKey(onClose: () => void, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, enabled]);
}
