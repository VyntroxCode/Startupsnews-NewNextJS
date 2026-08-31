"use client";

import type { ReactNode } from "react";

interface RepeatableListProps<T> {
  /** Distinguishes this list's DOM ids — wrapper renders as `field-{fieldId}`, error as `err-{fieldId}`. */
  fieldId: string;
  items: T[];
  onChange: (items: T[]) => void;
  /** Removing the last row down to `min` is disabled — a repeatable field can't go empty. */
  min: number;
  max: number;
  createRow: () => T;
  renderRow: (item: T, idx: number, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  error?: string;
  onBlurValidate?: () => void;
  removeTitle?: string;
}

/** Generic add/remove row list (repeatable text/url fields, etc.) — generalized from the
 * site's original speaker/guest editor pattern so any "1 to N of the same shape" field can
 * reuse the same add/remove/min/max/error mechanics instead of hand-rolling them per field. */
export function RepeatableList<T>({
  fieldId,
  items,
  onChange,
  min,
  max,
  createRow,
  renderRow,
  addLabel,
  error,
  onBlurValidate,
  removeTitle = "Remove this row",
}: RepeatableListProps<T>) {
  function update(idx: number, patch: Partial<T>) {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function removeRow(idx: number) {
    if (items.length <= min) return;
    onChange(items.filter((_, i) => i !== idx));
    onBlurValidate?.();
  }

  function addRow() {
    if (items.length >= max) return;
    onChange([...items, createRow()]);
  }

  const errorId = `err-${fieldId}`;

  return (
    <div className={"field" + (error ? " has-error" : "")} id={`field-${fieldId}`}>
      <div className="repeatable-box">
        {items.map((item, idx) => (
          <div className="repeatable-row" data-idx={idx} key={idx}>
            {renderRow(item, idx, (patch) => update(idx, patch))}
            {items.length > min && (
              <button
                type="button"
                className="sp-remove-btn"
                title={removeTitle}
                aria-label={removeTitle}
                onClick={() => removeRow(idx)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {items.length < max && (
          <button type="button" className="add-link" onClick={addRow}>
            + {addLabel}
          </button>
        )}
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id={errorId} aria-live="polite">
        {error}
      </div>
    </div>
  );
}
