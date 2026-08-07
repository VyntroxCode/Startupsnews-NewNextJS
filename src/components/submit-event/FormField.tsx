"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  id: string;
  label: string;
  optionalHint?: string;
  required?: boolean;
  type?: "text" | "email" | "url" | "date" | "time" | "textarea";
  rows?: number;
  placeholder?: string;
  value: string;
  error?: string;
  hint?: ReactNode;
  min?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/** Generic labelled input/textarea with the site's field-error styling. Used for the form's simple text-ish fields. */
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
  onChange,
  onBlur,
}: FormFieldProps) {
  const inputId = `f-${id}`;
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
      {hint ? <div className="hint">{hint}</div> : null}
      <div className={"field-error" + (error ? " visible" : "")} id={`err-${id}`}>
        {error}
      </div>
    </div>
  );
}
