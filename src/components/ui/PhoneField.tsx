"use client";

import { CustomSelect } from "./CustomSelect";
import { COUNTRY_CODE_OPTIONS, PHONE_RULES } from "./constants/phone";

// Flag emoji (regional-indicator character pairs) don't render as flags on every platform —
// Windows Chrome/Edge in particular falls back to showing the raw two-letter sequence as plain
// text ("ES", "SA", "NZ"...), which reads as a rendering bug rather than a country code. Showing
// the ISO code as deliberate, uniformly-formatted text ("ES +34") instead is deterministic on
// every platform and reads as intentional rather than a broken glyph.
const PHONE_CODE_OPTIONS = COUNTRY_CODE_OPTIONS.map((c) => ({
  value: c.code,
  label: c.code === "other" ? "Other" : `${c.iso.toUpperCase()} ${c.code}`,
}));

interface PhoneFieldProps {
  /** Distinguishes this field's DOM ids when more than one PhoneField could ever appear on a
   * page. Defaults to "organizer-phone" so /submit-event's existing ids are unchanged. */
  id?: string;
  label?: string;
  required?: boolean;
  phoneCode: string;
  phoneCodeCustom: string;
  phoneNumber: string;
  error?: string;
  onChangeCode: (value: string) => void;
  onChangeCustomCode: (value: string) => void;
  onChangeNumber: (value: string) => void;
  onBlurValidate: () => void;
}

export function PhoneField({
  id = "organizer-phone",
  label = "Contact Number",
  required = true,
  phoneCode,
  phoneCodeCustom,
  phoneNumber,
  error,
  onChangeCode,
  onChangeCustomCode,
  onChangeNumber,
  onBlurValidate,
}: PhoneFieldProps) {
  const effectiveCode = phoneCode === "other" ? (phoneCodeCustom.trim() || "other") : phoneCode;
  const rule = PHONE_RULES[effectiveCode] || PHONE_RULES.other;
  const numberId = `f-${id}-number`;
  const errorId = `err-${id}`;

  return (
    <div className={"field" + (error ? " has-error" : "")} id={`field-${id}`}>
      <label htmlFor={numberId}>{label}{required ? " *" : ""}</label>
      <div className="phone-row">
        <CustomSelect
          options={PHONE_CODE_OPTIONS}
          value={phoneCode}
          onChange={(v) => {
            onChangeCode(v);
            onBlurValidate();
          }}
          ariaLabel="Country code"
        />
        {phoneCode === "other" && (
          <input
            type="text"
            placeholder="+xxx"
            value={phoneCodeCustom}
            onChange={(e) => onChangeCustomCode(e.target.value)}
            onBlur={onBlurValidate}
          />
        )}
        <input
          id={numberId}
          type="tel"
          inputMode="numeric"
          maxLength={rule.maxLen}
          placeholder="e.g. 98765 43210"
          value={phoneNumber}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChangeNumber(e.target.value.replace(/\D/g, "").slice(0, rule.maxLen))}
          onKeyDown={(e) => {
            const isDigit = /^[0-9]$/.test(e.key);
            const isControlKey = e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey;
            if (!isDigit && !isControlKey) { e.preventDefault(); return; }
            const hasSelection = e.currentTarget.selectionStart !== e.currentTarget.selectionEnd;
            if (isDigit && !hasSelection && phoneNumber.length >= rule.maxLen) e.preventDefault();
          }}
          onBlur={onBlurValidate}
        />
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id={errorId} aria-live="polite">
        {error}
      </div>
    </div>
  );
}
