export const TYPES = ['Social Media', 'Events', 'PR-National', 'PR-International', 'Others'] as const;
export const STATUSES = [
  'Query received', 'Initiated', 'Under discussion', 'On hold', 'Dropped',
  'No response', 'Will reach when needed', 'Successfully closed',
] as const;
export const STATUS_COLORS: Record<string, [string, string]> = {
  'Query received': ['#EFF6FF', '#1D4ED8'], Initiated: ['#E9F7EE', '#1F7A3F'],
  'Under discussion': ['#FFF3D6', '#8A5A00'], 'On hold': ['#F1EFE8', '#5F5E5A'],
  Dropped: ['#FCE4E4', '#B3231F'], 'No response': ['#FCE4E4', '#B3231F'],
  'Will reach when needed': ['#FFF3D6', '#8A5A00'], 'Successfully closed': ['#E9F7EE', '#1F7A3F'],
};
export const SUMMARY_STATUSES = ['Initiated', 'In progress', 'Successfully closed', 'Dropped'];
export const STATUS_TO_SUMMARY: Record<string, string> = {
  'Query received': 'In progress', Initiated: 'Initiated', 'Under discussion': 'In progress',
  'On hold': 'In progress', Dropped: 'Dropped', 'No response': 'In progress',
  'Will reach when needed': 'In progress', 'Successfully closed': 'Successfully closed',
};

export const COUNTRY_CODE_META: Record<string, string> = {
  '+91': 'in', '+1': 'us', '+44': 'gb', '+971': 'ae', '+65': 'sg', '+61': 'au', '+49': 'de',
  '+33': 'fr', '+81': 'jp', '+86': 'cn', '+7': 'ru', '+55': 'br', '+27': 'za', '+92': 'pk',
  '+880': 'bd', '+94': 'lk', '+977': 'np', '+60': 'my', '+62': 'id', '+63': 'ph', '+66': 'th',
  '+82': 'kr', '+39': 'it', '+34': 'es', '+31': 'nl', '+52': 'mx', '+966': 'sa', '+64': 'nz',
};
export const COUNTRY_CODES = Object.keys(COUNTRY_CODE_META).concat(['other']);
export const PHONE_RULES: Record<string, { pattern: RegExp; message: string }> = {
  '+91': { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.' },
  '+1': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit US/Canada phone number.' },
  '+44': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit UK phone number.' },
  '+971': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit UAE phone number.' },
  '+65': { pattern: /^\d{8}$/, message: 'Enter a valid 8-digit Singapore phone number.' },
  '+61': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Australian phone number.' },
  '+49': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit German phone number.' },
  '+33': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit French phone number.' },
  '+81': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Japanese phone number.' },
  '+86': { pattern: /^\d{11}$/, message: 'Enter a valid 11-digit Chinese phone number.' },
  '+7': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Russian phone number.' },
  '+55': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit Brazilian phone number.' },
  '+27': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit South African phone number.' },
  '+92': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Pakistani phone number.' },
  '+880': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Bangladeshi phone number.' },
  '+94': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Sri Lankan phone number.' },
  '+977': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Nepali phone number.' },
  '+60': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Malaysian phone number.' },
  '+62': { pattern: /^\d{9,12}$/, message: 'Enter a valid 9-12 digit Indonesian phone number.' },
  '+63': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Philippine phone number.' },
  '+66': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Thai phone number.' },
  '+82': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit South Korean phone number.' },
  '+39': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Italian phone number.' },
  '+34': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Spanish phone number.' },
  '+31': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Dutch phone number.' },
  '+52': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Mexican phone number.' },
  '+966': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Saudi Arabian phone number.' },
  '+64': { pattern: /^\d{8,9}$/, message: 'Enter a valid 8-9 digit New Zealand phone number.' },
  other: { pattern: /^\d{6,15}$/, message: 'Enter a valid phone number (6-15 digits).' },
};
export const CUSTOM_CODE_RE = /^\+\d{1,4}$/;
