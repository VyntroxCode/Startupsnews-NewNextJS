'use client';

import { useEffect, useRef } from 'react';

/** Open Escape handlers, oldest first. Only the last (the most recently opened modal) reacts. */
const escapeStack: symbol[] = [];

/**
 * Calls `onClose` when the Escape key is pressed — the standard "press Esc to close" behavior
 * for modals/dialogs/popups. Safe to call unconditionally in a component that's only ever
 * mounted while its modal is open (the listener is attached/removed with the component's own
 * lifecycle); for a component that stays mounted with its modal toggled by state, pass
 * `enabled` so the listener isn't live while the modal is actually closed.
 *
 * With modals stacked (e.g. HR Directory: employee profile → credential / KYC-reject dialog on
 * top), only the most recently opened one closes — every listener used to fire on the same key
 * press, so one Esc closed the dialog AND the profile underneath it. `onClose` is read through a
 * ref so a re-render (inline callbacks change identity every time) doesn't re-register the
 * handler and jump it to the top of the stack.
 */
export function useEscapeKey(onClose: () => void, enabled: boolean = true): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!enabled) return;
    const id = Symbol('escape');
    escapeStack.push(id);
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && escapeStack[escapeStack.length - 1] === id) onCloseRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const i = escapeStack.indexOf(id);
      if (i !== -1) escapeStack.splice(i, 1);
    };
  }, [enabled]);
}
