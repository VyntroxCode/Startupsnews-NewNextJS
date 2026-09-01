"use client";

import { useState } from "react";
import { formatIndianCurrency, parseIndianShorthand } from "@/lib/format/indian-number";

interface MoneyInputProps {
  id: string;
  label: string;
  optionalHint?: string;
  required?: boolean;
  value: string;
  error?: string;
  onChange: (raw: string) => void;
  onBlur?: () => void;
}

/**
 * Money field with Indian-shorthand entry ("4.5L", "2Cr", "50K") and comma-grouped display.
 * `inputMode="numeric"` on a text input, not `type="number"` — that kills the spinner/scroll-wheel
 * bug and lets shorthand parsing work. Raw text while focused (so shorthand stays editable),
 * formatted `₹4,50,000` once blurred. Never blocks keystrokes; validation happens on the parsed
 * value elsewhere, not here.
 */
export function MoneyInput({ id, label, optionalHint, required, value, error, onChange, onBlur }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const inputId = `f-${id}`;
  const errorId = `err-${id}`;

  let display = value;
  if (!focused && value !== "") {
    const parsed = parseIndianShorthand(value);
    if (parsed !== null) display = formatIndianCurrency(parsed);
  }

  return (
    <div className={"field" + (error ? " has-error" : "")} id={`field-${id}`}>
      <label htmlFor={inputId}>
        {label}
        {required ? " *" : ""}
        {optionalHint ? <span className="opt"> {optionalHint}</span> : null}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={display}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={"field-error" + (error ? " visible" : "")} id={errorId} aria-live="polite">
        {error}
      </div>
    </div>
  );
}
