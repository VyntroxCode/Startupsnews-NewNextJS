export interface PhoneRule {
  pattern: RegExp;
  message: string;
  /** Longest number of digits this country's rule allows — used to cap keystrokes/paste as the user types. */
  maxLen: number;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  '+91': { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.', maxLen: 10 },
  '+1': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit US/Canada phone number.', maxLen: 10 },
  '+44': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit UK phone number.', maxLen: 11 },
  '+971': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit UAE phone number.', maxLen: 9 },
  '+65': { pattern: /^\d{8}$/, message: 'Enter a valid 8-digit Singapore phone number.', maxLen: 8 },
  '+61': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Australian phone number.', maxLen: 9 },
  '+49': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit German phone number.', maxLen: 11 },
  '+33': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit French phone number.', maxLen: 9 },
  '+81': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Japanese phone number.', maxLen: 10 },
  '+86': { pattern: /^\d{11}$/, message: 'Enter a valid 11-digit Chinese phone number.', maxLen: 11 },
  '+7': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Russian phone number.', maxLen: 10 },
  '+55': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit Brazilian phone number.', maxLen: 11 },
  '+27': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit South African phone number.', maxLen: 9 },
  '+92': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Pakistani phone number.', maxLen: 10 },
  '+880': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Bangladeshi phone number.', maxLen: 10 },
  '+94': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Sri Lankan phone number.', maxLen: 9 },
  '+977': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Nepali phone number.', maxLen: 10 },
  '+60': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Malaysian phone number.', maxLen: 10 },
  '+62': { pattern: /^\d{9,12}$/, message: 'Enter a valid 9-12 digit Indonesian phone number.', maxLen: 12 },
  '+63': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Philippine phone number.', maxLen: 10 },
  '+66': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Thai phone number.', maxLen: 9 },
  '+82': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit South Korean phone number.', maxLen: 10 },
  '+39': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Italian phone number.', maxLen: 10 },
  '+34': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Spanish phone number.', maxLen: 9 },
  '+31': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Dutch phone number.', maxLen: 9 },
  '+52': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Mexican phone number.', maxLen: 10 },
  '+966': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Saudi Arabian phone number.', maxLen: 9 },
  '+64': { pattern: /^\d{8,9}$/, message: 'Enter a valid 8-9 digit New Zealand phone number.', maxLen: 9 },
  other: { pattern: /^\d{6,15}$/, message: 'Enter a valid phone number (6-15 digits).', maxLen: 15 },
};

export interface CountryCodeOption {
  code: string;
  iso: string;
  emoji: string;
}

export const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { code: '+91', iso: 'in', emoji: '🇮🇳' },
  { code: '+1', iso: 'us', emoji: '🇺🇸' },
  { code: '+44', iso: 'gb', emoji: '🇬🇧' },
  { code: '+971', iso: 'ae', emoji: '🇦🇪' },
  { code: '+65', iso: 'sg', emoji: '🇸🇬' },
  { code: '+61', iso: 'au', emoji: '🇦🇺' },
  { code: '+49', iso: 'de', emoji: '🇩🇪' },
  { code: '+33', iso: 'fr', emoji: '🇫🇷' },
  { code: '+81', iso: 'jp', emoji: '🇯🇵' },
  { code: '+86', iso: 'cn', emoji: '🇨🇳' },
  { code: '+7', iso: 'ru', emoji: '🇷🇺' },
  { code: '+55', iso: 'br', emoji: '🇧🇷' },
  { code: '+27', iso: 'za', emoji: '🇿🇦' },
  { code: '+92', iso: 'pk', emoji: '🇵🇰' },
  { code: '+880', iso: 'bd', emoji: '🇧🇩' },
  { code: '+94', iso: 'lk', emoji: '🇱🇰' },
  { code: '+977', iso: 'np', emoji: '🇳🇵' },
  { code: '+60', iso: 'my', emoji: '🇲🇾' },
  { code: '+62', iso: 'id', emoji: '🇮🇩' },
  { code: '+63', iso: 'ph', emoji: '🇵🇭' },
  { code: '+66', iso: 'th', emoji: '🇹🇭' },
  { code: '+82', iso: 'kr', emoji: '🇰🇷' },
  { code: '+39', iso: 'it', emoji: '🇮🇹' },
  { code: '+34', iso: 'es', emoji: '🇪🇸' },
  { code: '+31', iso: 'nl', emoji: '🇳🇱' },
  { code: '+52', iso: 'mx', emoji: '🇲🇽' },
  { code: '+966', iso: 'sa', emoji: '🇸🇦' },
  { code: '+64', iso: 'nz', emoji: '🇳🇿' },
  { code: 'other', iso: '', emoji: '🌐' },
];

export const CUSTOM_CODE_RE = /^\+\d{1,4}$/;
