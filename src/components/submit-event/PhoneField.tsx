"use client";

import { CustomSelect } from "./CustomSelect";
import { COUNTRY_CODE_OPTIONS, PHONE_RULES } from "./constants";

const PHONE_CODE_OPTIONS = COUNTRY_CODE_OPTIONS.map((c) => ({
  value: c.code,
  label: c.code === "other" ? "Other" : c.code,
  emoji: c.emoji,
}));

interface PhoneFieldProps {
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

  return (
    <div className={"field" + (error ? " has-error" : "")} id="field-organizer-phone">
      <label htmlFor="f-organizer-phone-number">Contact Number *</label>
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
          id="f-organizer-phone-number"
          type="tel"
          inputMode="numeric"
          maxLength={rule.maxLen}
          placeholder="e.g. 98765 43210"
          value={phoneNumber}
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
      <div className={"field-error" + (error ? " visible" : "")} id="err-organizer-phone">
        {error}
      </div>
    </div>
  );
}
