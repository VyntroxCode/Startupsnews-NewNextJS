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
  /** `update` replaces the whole row value — works uniformly whether T is a primitive (a plain
   * string/url row) or an object (merge it yourself: `update({ ...item, name: v })`). */
  renderRow: (item: T, idx: number, update: (value: T) => void) => ReactNode;
  addLabel: string;
  error?: string;
  onBlurValidate?: () => void;
  removeTitle?: string;
  /** Override the wrapper/row/remove-button class names — needed when an existing stylesheet
   * targets specific class names (e.g. /submit-event's `.speakers-box`/`.speaker-row` grid CSS)
   * rather than this component's generic defaults. */
  boxClassName?: string;
  rowClassName?: string;
  removeButtonClassName?: string;
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
  boxClassName = "repeatable-box",
  rowClassName = "repeatable-row",
  removeButtonClassName = "sp-remove-btn",
}: RepeatableListProps<T>) {
  function update(idx: number, value: T) {
    onChange(items.map((item, i) => (i === idx ? value : item)));
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
      <div className={boxClassName}>
        {items.map((item, idx) => (
          <div className={rowClassName} data-idx={idx} key={idx}>
            {renderRow(item, idx, (value) => update(idx, value))}
            {items.length > min && (
              <button
                type="button"
                className={removeButtonClassName}
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
