"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  id: string;
  label: string;
  optionalHint?: string;
  required?: boolean;
  type?: "text" | "email" | "url" | "date" | "time" | "tel" | "number" | "textarea";
  rows?: number;
  placeholder?: string;
  value: string;
  error?: string;
  hint?: ReactNode;
  min?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/** Generic labelled input/textarea with the site's field-error styling. Used across the site's
 * multi-step forms for simple text-ish fields. */
export function FormField({
  id,
  label,
  optionalHint,
  required,
  type = "text",
  rows,
  placeholder,
  value,
  error,
  hint,
  min,
  maxLength,
  inputMode,
  onChange,
  onBlur,
}: FormFieldProps) {
  const inputId = `f-${id}`;
  const errorId = `err-${id}`;
  return (
    <div className={"field" + (error ? " has-error" : "")} id={`field-${id}`}>
      <label htmlFor={inputId}>
        {label}
        {required ? " *" : ""}
        {optionalHint ? <span className="opt"> {optionalHint}</span> : null}
      </label>
      {type === "textarea" ? (
        <textarea
          id={inputId}
          rows={rows || 4}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          min={min}
          maxLength={maxLength}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
      {hint ? <div className="hint">{hint}</div> : null}
      <div className={"field-error" + (error ? " visible" : "")} id={errorId} aria-live="polite">
        {error}
      </div>
    </div>
  );
}
