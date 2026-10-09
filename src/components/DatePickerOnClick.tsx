"use client";

import { useEffect } from "react";

const CALENDAR_INPUTS = 'input[type="date"], input[type="datetime-local"], input[type="month"], input[type="week"]';

/**
 * Opens the browser's calendar when a date field is clicked anywhere, not only on its
 * small calendar icon. One listener on the document covers every date field on the site
 * (public forms, admin, employee), including ones rendered later inside modals.
 */
export function DatePickerOnClick() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || !target.matches(CALENDAR_INPUTS)) return;
      if (target.disabled || target.readOnly) return;
      try {
        target.showPicker();
      } catch {
        // Older browsers without showPicker(): the calendar icon still works.
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
