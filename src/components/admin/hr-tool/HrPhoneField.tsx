'use client';

import { useEffect, useRef } from 'react';
import { PhoneField } from '@/components/ui/PhoneField';
import { COUNTRY_CODE_OPTIONS } from '@/components/ui/constants/phone';
import { composePhone, type PhoneParts } from '@/components/lead-forms/shared/compose';
import { validatePhone } from '@/components/lead-forms/shared/validation';

/*
 * The HR tool's contact-number field: the very same PhoneField (country-code picker + number) and
 * per-country digit rules (validatePhone) the public forms — Feature Your Startup, Submit Funding
 * Round — use, so an employee's number is checked exactly like everywhere else on the site.
 *
 * Stored as "+91 9876543210" (same as the Sales Tracker). Numbers saved before this — bare digits,
 * no code — open as India (+91) with the digits in place, and are rewritten with their code on the
 * next save. PhoneField's markup is styled by page CSS elsewhere (`.snf-page …`); here the wrapper
 * styles it with Tailwind arbitrary variants so it matches the HR tool's own inputs. The `!` ones
 * beat `.hr-tool-app input[type=text]`, which would otherwise draw a second box inside the picker.
 */

export type HrPhoneParts = Pick<PhoneParts, 'phoneCode' | 'phoneCodeCustom' | 'phoneNumber'>;

const KNOWN_CODES = COUNTRY_CODE_OPTIONS.map((c) => c.code).filter((c) => c !== 'other');

/** A stored number back into the three inputs PhoneField edits. */
export function phonePartsFromStored(stored: string | null | undefined): HrPhoneParts {
  const value = (stored || '').trim();
  const m = value.match(/^(\+\d{1,4})\s+(.*)$/);
  if (!m) return { phoneCode: '+91', phoneCodeCustom: '', phoneNumber: value.replace(/\D/g, '') };
  const digits = m[2].replace(/\D/g, '');
  return KNOWN_CODES.includes(m[1])
    ? { phoneCode: m[1], phoneCodeCustom: '', phoneNumber: digits }
    : { phoneCode: 'other', phoneCodeCustom: m[1], phoneNumber: digits };
}

/** "+91 9876543210", or '' when no number was entered. */
export function storedPhoneFromParts(parts: HrPhoneParts): string {
  return composePhone({ ...parts, phone: '' });
}

/** '' when valid. An empty number is only an error when `required`. */
export function hrPhoneError(parts: HrPhoneParts, required: boolean): string {
  if (!parts.phoneNumber.replace(/\D/g, '')) return required ? 'Please enter a contact number.' : '';
  return validatePhone({ ...parts, phone: '' });
}

const WRAPPER = [
  // label — same look as .hr-tool-app label.field-label
  '[&_label]:mb-[5px] [&_label]:block [&_label]:text-[11.5px] [&_label]:font-semibold [&_label]:text-[#94A3B8]',
  // code picker + number side by side; stacked on narrow screens
  '[&_.phone-row]:flex [&_.phone-row]:gap-2 max-sm:[&_.phone-row]:flex-col',
  // sized to the code it shows (--phone-code-w, set by PhoneField) rather than a fixed width
  '[&_.phone-row>.custom-select-wrap]:w-[calc(var(--phone-code-w,3.4em)+38px)] [&_.phone-row>.custom-select-wrap]:text-[13px] [&_.phone-row>.custom-select-wrap]:shrink-0 max-sm:[&_.phone-row>.custom-select-wrap]:w-full',
  '[&_.phone-row>input[type=text]]:w-20! [&_.phone-row>input[type=text]]:shrink-0',
  '[&_.custom-select-wrap]:relative',
  // the picker's box (a div around a search input)
  '[&_.custom-select-btn]:flex [&_.custom-select-btn]:cursor-text [&_.custom-select-btn]:items-center [&_.custom-select-btn]:gap-1.5',
  '[&_.custom-select-btn]:rounded-[7px] [&_.custom-select-btn]:border [&_.custom-select-btn]:border-[#E2E8F0] [&_.custom-select-btn]:bg-white',
  '[&_.custom-select-btn]:px-2.5 [&_.custom-select-btn]:py-2 [&_.custom-select-btn]:text-[13px]',
  '[&_.custom-select-btn.open]:border-indigo-400 [&_.custom-select-btn:focus-within]:border-indigo-400',
  '[&_.cs-input]:min-w-0! [&_.cs-input]:flex-1 [&_.cs-input]:border-0! [&_.cs-input]:bg-transparent! [&_.cs-input]:p-0! [&_.cs-input]:outline-none',
  '[&_.caret]:text-[10px] [&_.caret]:text-[#94A3B8]',
  // the searchable list
  '[&_.custom-select-list]:absolute [&_.custom-select-list]:left-0 [&_.custom-select-list]:top-[calc(100%+4px)] [&_.custom-select-list]:z-50',
  '[&_.custom-select-list]:m-0 [&_.custom-select-list]:hidden [&_.custom-select-list]:max-h-64 [&_.custom-select-list]:min-w-[260px]',
  '[&_.custom-select-list]:list-none [&_.custom-select-list]:overflow-y-auto [&_.custom-select-list]:rounded-lg [&_.custom-select-list]:border',
  '[&_.custom-select-list]:border-[#E2E8F0] [&_.custom-select-list]:bg-white [&_.custom-select-list]:p-1 [&_.custom-select-list]:shadow-lg',
  '[&_.custom-select-list.open]:block',
  '[&_.custom-select-list_li]:cursor-pointer [&_.custom-select-list_li]:rounded-md [&_.custom-select-list_li]:px-2.5 [&_.custom-select-list_li]:py-2 [&_.custom-select-list_li]:text-[13px]',
  '[&_.custom-select-list_li.active]:bg-indigo-50 [&_.custom-select-list_li.selected]:font-bold [&_.custom-select-list_li.selected]:text-indigo-700',
  '[&_.custom-select-list_li.cs-empty]:cursor-default [&_.custom-select-list_li.cs-empty]:italic [&_.custom-select-list_li.cs-empty]:text-[#94A3B8]',
  '[&_.cs-detail]:ml-2 [&_.cs-detail]:text-[#94A3B8]',
  // error line + red borders
  '[&_.field-error]:mt-1 [&_.field-error]:hidden [&_.field-error]:text-xs [&_.field-error]:text-red-600 [&_.field-error.visible]:block',
  '[&_.has-error_.custom-select-btn]:border-red-300 [&_.has-error_input[type=tel]]:border-red-300!',
].join(' ');

export default function HrPhoneField({ id, label = 'Contact number', required = false, parts, error, onChange, onBlur }: {
  id: string;
  label?: string;
  required?: boolean;
  parts: HrPhoneParts;
  error?: string;
  onChange: (parts: HrPhoneParts) => void;
  /** Called with the latest parts — PhoneField validates in the same tick as a code change, before
   * the parent's state has caught up, so reading state there would check the old code. */
  onBlur: (parts: HrPhoneParts) => void;
}) {
  // The edit not yet reflected in `parts` (set in the handler, dropped once the parent re-renders us).
  const pending = useRef<HrPhoneParts | null>(null);
  useEffect(() => { pending.current = null; }, [parts]);
  const change = (patch: Partial<HrPhoneParts>) => {
    pending.current = { ...(pending.current ?? parts), ...patch };
    onChange(pending.current);
  };
  return (
    <div className={WRAPPER}>
      <PhoneField
        id={id}
        label={label}
        required={required}
        phoneCode={parts.phoneCode}
        phoneCodeCustom={parts.phoneCodeCustom}
        phoneNumber={parts.phoneNumber}
        error={error}
        allowOtherCode
        onChangeCode={(v) => change({ phoneCode: v })}
        onChangeCustomCode={(v) => change({ phoneCodeCustom: v })}
        onChangeNumber={(v) => change({ phoneNumber: v })}
        onBlurValidate={() => onBlur(pending.current ?? parts)}
      />
    </div>
  );
}
