"use client";

import { useMemo } from "react";

const MIN_CHARS = 200;
const SUGGESTED_CHARS = 600;
const MAX_CHARS = 5000;

interface Prompt {
  label: string;
  keywords: string[];
}

// Keyword clusters are a soft nudge only, never a validation gate — ticking off is just
// encouragement that a prompt has probably been addressed, not a check the schema enforces.
const PROMPTS: Prompt[] = [
  { label: "The problem", keywords: ["problem", "pain point", "pain", "struggle", "challenge", "issue"] },
  { label: "Who faces it", keywords: ["founders", "businesses", "customers", "users", "sme", "startups", "consumers", "people"] },
  { label: "Why it matters", keywords: ["because", "impact", "cost", "inefficient", "matters", "important", "loss"] },
  { label: "Your solution", keywords: ["solution", "we built", "our product", "platform", "app", "solves", "enables", "we provide"] },
  { label: "What's unique", keywords: ["unlike", "unique", "different", "only", "first", "proprietary", "moat", "no one else"] },
  { label: "5-year vision", keywords: ["vision", "future", "next 5 years", "scale", "expand", "become the", "aim to"] },
];

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

interface GuidedDescriptionFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function GuidedDescriptionField({ value, error, onChange, onBlur }: GuidedDescriptionFieldProps) {
  const lower = value.toLowerCase();
  const words = useMemo(() => wordCount(value), [value]);
  const addressed = useMemo(() => PROMPTS.map((p) => p.keywords.some((k) => lower.includes(k))), [lower]);

  return (
    <div className={"field" + (error ? " has-error" : "")} id="field-description">
      <label htmlFor="f-description">Describe your startup *</label>
      <ul className="ix-prompt-checklist" aria-label="Things worth covering (not required, just a guide)">
        {PROMPTS.map((p, i) => (
          <li key={p.label} data-done={addressed[i]}>
            <span className="ix-prompt-glyph" aria-hidden="true">{addressed[i] ? "✓" : "○"}</span>
            {p.label}
          </li>
        ))}
      </ul>
      <textarea
        id="f-description"
        rows={7}
        maxLength={MAX_CHARS}
        placeholder="Tell us what problem you're solving, for whom, and why your approach is the right one…"
        value={value}
        aria-invalid={!!error}
        aria-describedby="err-description"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <div className="ix-field-meta">
        <span>{words} words</span>
        <span>
          {value.length < MIN_CHARS
            ? `${MIN_CHARS - value.length} more characters to the minimum`
            : value.length < SUGGESTED_CHARS
              ? `${value.length} / ${SUGGESTED_CHARS}+ suggested`
              : `${value.length} characters`}
        </span>
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id="err-description" aria-live="polite">
        {error}
      </div>
    </div>
  );
}
