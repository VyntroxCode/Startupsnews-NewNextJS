"use client";

import { CustomSelect } from "./CustomSelect";
import { COUNTRY_CODE_OPTIONS } from "./constants";

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
          placeholder="e.g. 98765 43210"
          value={phoneNumber}
          onChange={(e) => onChangeNumber(e.target.value)}
          onBlur={onBlurValidate}
        />
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id="err-organizer-phone">
        {error}
      </div>
    </div>
  );
}
