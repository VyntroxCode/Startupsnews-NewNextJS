import type { Speaker } from '@/modules/partnership-events/domain/types';
// Re-exported so existing cross-feature imports (e.g. admin/partnership-tracker) keep working
// unchanged — the actual data now lives in the shared components/ui location.
export type { PhoneRule, CountryCodeOption } from '@/components/ui/constants/phone';
export { PHONE_RULES, COUNTRY_CODE_OPTIONS, CUSTOM_CODE_RE } from '@/components/ui/constants/phone';

export const ALL_COUNTRIES = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Congo-Brazzaville)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'];

export const COUNTRIES = ['India'].concat(ALL_COUNTRIES.filter((c) => c !== 'India').sort((a, b) => a.localeCompare(b)));

// CITY_DATA (this form's own 44-country / 707-city list) removed: the City dropdown now reads
// the admin Partnership Tracker's curated COUNTRY_CITY_DATA through citiesForCountry, so there is
// one list, not two that drift. See CountryCityFields.

export const OTHER_CITY_VALUE = '__other__';
export const OTHER_COUNTRY_VALUE = '__other__';

/** Re-exported so the form and the API agree on one definition — see the domain module for why
 * these two values must stay in lockstep. */
export { ONLINE_LOCATION_LABEL, ONLINE_PARTNERSHIP_TYPE } from '@/modules/partnership-events/domain/types';
export { DEFAULT_END_TIME, resolveDefaultEndTime } from '@/modules/event-submission/domain/types';

export interface ImageSpec {
  width: number;
  height: number;
}

export const IMAGE_SPECS: Record<string, ImageSpec> = {
  cover: { width: 1260, height: 630 },
  banner: { width: 2438, height: 413 },
  social: { width: 1080, height: 1440 },
};

export const SOCIAL_PLATFORMS = [
  { slot: 1, key: 'instagram', label: 'Instagram', emoji: '📸' },
  { slot: 2, key: 'facebook', label: 'Facebook', emoji: '📘' },
  { slot: 3, key: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { slot: 4, key: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
] as const;

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXT_RE = /\.(jpe?g|png|webp)([?#].*)?$/i;
/** The one place the accepted formats are spelled out for humans — keep in step with the two
 *  lists above so the hint, the error message and the file picker can never disagree. */
export const ALLOWED_IMAGE_LABEL = 'JPG/JPEG/PNG/WEBP';
export const ALLOWED_IMAGE_ERROR = 'Only JPG, JPEG, PNG, or WEBP files are allowed.';
/** `accept` for the hidden <input type="file">. Extensions are listed alongside the MIME types
 *  because some OS file pickers filter on extension alone. */
export const ALLOWED_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DESC_TARGET_WORDS = 400;

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function emptySpeaker(): Speaker {
  return { name: '', designation: '', company: '', others: '' };
}
