/**
 * Phone normalization + offline validity check, ported from clean_contacts.py's
 * norm_phone() / validate_number() / _looks_like_junk(), using libphonenumber-js
 * (the JS port of the same Google libphonenumber data the Python `phonenumbers`
 * package wraps) instead of a hand-rolled country-calling-code table.
 */
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { COUNTRY_TO_ISO2 } from './geo';

// Column headers that must NEVER be treated as a phone number even if numeric
// (ticket/account/GST/invoice numbers, etc).
const PHONE_BLOCKLIST = /ticket|acknowledg|account|a\/c|txn|transaction|ref\b|reference|gst|pan|invoice|order|amount|price|cost|revenue|salary|pin\b|zip|aadhaar|aadhar/i;

export interface NormalizedPhone {
  /** '' when the value isn't a plausible phone at all. */
  value: string;
  /** true when `value` is digits kept for manual review, not a confirmed country match. */
  uncertain: boolean;
}

const EMPTY: NormalizedPhone = { value: '', uncertain: false };

/**
 * Normalizes a single phone cell. Mirrors the Python tool's tiering:
 *  1. An explicit "+"/00 international prefix is trusted as-is.
 *  2. Otherwise it's domestic-format: parsed against the row's own country
 *     hint (defaulting to India, matching this tool's predominant dataset).
 *  3. If that can't be validated, the digits are kept with a "?" sentinel
 *     for manual review rather than silently dropped or mis-assigned.
 */
export function normalizePhone(raw: unknown, opts: { header?: string; countryHint?: string } = {}): NormalizedPhone {
  if (raw == null) return EMPTY;
  if (opts.header && PHONE_BLOCKLIST.test(opts.header)) return EMPTY;
  let s = String(raw).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  const hadPlusRaw = s.trimStart().startsWith('+') || s.slice(0, 2).includes('+');
  let d = s.replace(/\D/g, '');
  if (!d) return EMPTY;
  let hadPlus = hadPlusRaw;
  if (d.startsWith('00')) { d = d.slice(2); hadPlus = true; }

  // Stray extra 0 in front of an already-91-prefixed mobile.
  if (d.startsWith('0') && /^91[6-9]\d{9}$/.test(d.slice(1))) {
    return { value: '+' + d.slice(1), uncertain: false };
  }

  // No real country calling code begins with "0" -- a leading 0 means any "+"
  // that was typed is spurious (a domestic number that got a stray + in front).
  hadPlus = hadPlus && !d.startsWith('0');

  if (hadPlus) {
    const parsed = parsePhoneNumberFromString('+' + d);
    if (parsed && parsed.isValid()) return { value: parsed.number, uncertain: false };
    if (d.length >= 8 && d.length <= 15) return { value: '+' + d, uncertain: false };
    return EMPTY;
  }

  const region = (opts.countryHint && COUNTRY_TO_ISO2[opts.countryHint]) || 'IN';
  const parsedDomestic = parsePhoneNumberFromString(d, region as CountryCode);
  if (parsedDomestic && parsedDomestic.isValid()) return { value: parsedDomestic.number, uncertain: false };

  const core = d.replace(/^0+/, '');
  if (!core) return EMPTY;
  if (core.length >= 8 && core.length <= 15) return { value: '?' + core, uncertain: true };
  return EMPTY;
}

/** Pattern-level check for obviously fake numbers that still pass country-format
 * validation (e.g. +12345678900). Checked on the digits AFTER the country code. */
function looksLikeJunk(nationalDigits: string): string {
  const d = nationalDigits;
  if (new Set(d.split('')).size === 1) return 'repeating digit';
  const ascend = '01234567890123456789';
  const descend = '98765432109876543210';
  if (d.length >= 7) {
    for (let n = d.length; n > 6; n--) {
      for (let i = 0; i <= d.length - n; i++) {
        const chunk = d.slice(i, i + n);
        if (ascend.includes(chunk) || descend.includes(chunk)) return 'sequential digits';
      }
    }
  }
  if (/0{4,}$/.test(d)) return 'placeholder zeros';
  if (/^(\d{2,4})\1+\d{0,3}$/.test(d)) return 'repeating block';
  return '';
}

/** Collapses a phone value to a stable dedup/index key: the validated E.164 form when
 * available, otherwise the best-effort digits, with placeholder/repeating-digit filler
 * rejected. Used to compare "is this the same phone number" across rows and contacts. */
export function phoneMatchKey(raw: unknown, countryHint?: string): string {
  const { value } = normalizePhone(raw, { countryHint });
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) return '';
  if (/^(\d)\1+$/.test(digits)) return ''; // e.g. "0000000000", "1111111111"
  return value.startsWith('+') ? value : digits;
}

export type PhoneValidity = '' | 'Valid' | `Valid - suspicious (${string})` | 'Invalid' | 'Unrecognized country code';

/** Offline structural check (NOT a live "is this number in service" check) --
 * "is this a real, correctly-formatted number for its country". */
export function validatePhoneNumber(phone: string): PhoneValidity {
  if (!phone || !phone.startsWith('+')) return '';
  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed) return 'Unrecognized country code';
  if (!parsed.isValid()) return 'Invalid';
  const junk = looksLikeJunk(parsed.nationalNumber);
  return junk ? (`Valid - suspicious (${junk})` as PhoneValidity) : 'Valid';
}
