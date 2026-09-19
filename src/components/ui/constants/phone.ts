export interface PhoneRule {
  pattern: RegExp;
  message: string;
  /** Longest number of digits this country's rule allows — used to cap keystrokes/paste as the user types. */
  maxLen: number;
}

/** One dial code the phone control offers. A code shared by more than one country (+1 for USA and
 * Canada, +7 for Russia and Kazakhstan) is ONE entry listing every country under `names`, because
 * the stored value is the code itself and a select cannot hold the same value twice. The North
 * American Numbering Plan islands (Jamaica, Bahamas, …) carry their area code inside the dial
 * code, "+1876", which is how phone pickers everywhere present them and keeps them distinct from
 * the ten-digit +1 rule. */
interface DialCodeEntry {
  code: string;
  /** ISO 3166-1 alpha-2 of the first country under `names` — what the trigger shows ("IN +91"). */
  iso: string;
  /** Every country that uses this code; the first is the primary one. All are searchable. */
  names: string[];
  /** Digits (without the dial code) a number in this country has — min and max inclusive. */
  min: number;
  max: number;
  /** A tighter check than plain length, where one is well known (India: 10 digits, first 6-9). */
  pattern?: RegExp;
}

/** Every UN member state's dial code — the same 193 countries the Country dropdown offers
 * (components/submit-event/constants.ts), so a caller who has picked their country always finds
 * its code here too. Ordered alphabetically by primary country, matching that dropdown; the
 * control's default is set by each form (India everywhere today), not by list position.
 *
 * Lengths are national significant numbers, mobile where a country differs by line type, and
 * given as a RANGE where the country has more than one length. Where a country's plan is loose or
 * mid-migration the range errs wide, because a cap that is too tight locks a real caller out while
 * a range that is too loose only lets a typo through. */
const DIAL_CODES: DialCodeEntry[] = [
  { code: '+93', iso: 'af', names: ['Afghanistan'], min: 9, max: 9 },
  { code: '+355', iso: 'al', names: ['Albania'], min: 8, max: 9 },
  { code: '+213', iso: 'dz', names: ['Algeria'], min: 9, max: 9 },
  { code: '+376', iso: 'ad', names: ['Andorra'], min: 6, max: 9 },
  { code: '+244', iso: 'ao', names: ['Angola'], min: 9, max: 9 },
  { code: '+1268', iso: 'ag', names: ['Antigua and Barbuda'], min: 7, max: 7 },
  { code: '+54', iso: 'ar', names: ['Argentina'], min: 10, max: 11 },
  { code: '+374', iso: 'am', names: ['Armenia'], min: 8, max: 8 },
  { code: '+61', iso: 'au', names: ['Australia'], min: 9, max: 9 },
  { code: '+43', iso: 'at', names: ['Austria'], min: 7, max: 13 },
  { code: '+994', iso: 'az', names: ['Azerbaijan'], min: 9, max: 9 },
  { code: '+1242', iso: 'bs', names: ['Bahamas'], min: 7, max: 7 },
  { code: '+973', iso: 'bh', names: ['Bahrain'], min: 8, max: 8 },
  { code: '+880', iso: 'bd', names: ['Bangladesh'], min: 10, max: 10 },
  { code: '+1246', iso: 'bb', names: ['Barbados'], min: 7, max: 7 },
  { code: '+375', iso: 'by', names: ['Belarus'], min: 9, max: 9 },
  { code: '+32', iso: 'be', names: ['Belgium'], min: 8, max: 9 },
  { code: '+501', iso: 'bz', names: ['Belize'], min: 7, max: 7 },
  { code: '+229', iso: 'bj', names: ['Benin'], min: 8, max: 10 },
  { code: '+975', iso: 'bt', names: ['Bhutan'], min: 7, max: 8 },
  { code: '+591', iso: 'bo', names: ['Bolivia'], min: 8, max: 8 },
  { code: '+387', iso: 'ba', names: ['Bosnia and Herzegovina'], min: 8, max: 8 },
  { code: '+267', iso: 'bw', names: ['Botswana'], min: 7, max: 8 },
  { code: '+55', iso: 'br', names: ['Brazil'], min: 10, max: 11 },
  { code: '+673', iso: 'bn', names: ['Brunei'], min: 7, max: 7 },
  { code: '+359', iso: 'bg', names: ['Bulgaria'], min: 8, max: 9 },
  { code: '+226', iso: 'bf', names: ['Burkina Faso'], min: 8, max: 8 },
  { code: '+257', iso: 'bi', names: ['Burundi'], min: 8, max: 8 },
  { code: '+238', iso: 'cv', names: ['Cabo Verde'], min: 7, max: 7 },
  { code: '+855', iso: 'kh', names: ['Cambodia'], min: 8, max: 9 },
  { code: '+237', iso: 'cm', names: ['Cameroon'], min: 9, max: 9 },
  { code: '+236', iso: 'cf', names: ['Central African Republic'], min: 8, max: 8 },
  { code: '+235', iso: 'td', names: ['Chad'], min: 8, max: 8 },
  { code: '+56', iso: 'cl', names: ['Chile'], min: 9, max: 9 },
  { code: '+86', iso: 'cn', names: ['China'], min: 11, max: 11 },
  { code: '+57', iso: 'co', names: ['Colombia'], min: 10, max: 10 },
  { code: '+269', iso: 'km', names: ['Comoros'], min: 7, max: 7 },
  { code: '+506', iso: 'cr', names: ['Costa Rica'], min: 8, max: 8 },
  { code: '+225', iso: 'ci', names: ['Côte d’Ivoire', 'Ivory Coast'], min: 10, max: 10 },
  { code: '+385', iso: 'hr', names: ['Croatia'], min: 8, max: 9 },
  { code: '+53', iso: 'cu', names: ['Cuba'], min: 8, max: 8 },
  { code: '+357', iso: 'cy', names: ['Cyprus'], min: 8, max: 8 },
  { code: '+420', iso: 'cz', names: ['Czechia', 'Czech Republic'], min: 9, max: 9 },
  { code: '+243', iso: 'cd', names: ['Democratic Republic of the Congo', 'DR Congo'], min: 9, max: 9 },
  { code: '+45', iso: 'dk', names: ['Denmark'], min: 8, max: 8 },
  { code: '+253', iso: 'dj', names: ['Djibouti'], min: 8, max: 8 },
  { code: '+1767', iso: 'dm', names: ['Dominica'], min: 7, max: 7 },
  { code: '+1809', iso: 'do', names: ['Dominican Republic'], min: 7, max: 7 },
  { code: '+593', iso: 'ec', names: ['Ecuador'], min: 9, max: 9 },
  { code: '+20', iso: 'eg', names: ['Egypt'], min: 10, max: 10 },
  { code: '+503', iso: 'sv', names: ['El Salvador'], min: 8, max: 8 },
  { code: '+240', iso: 'gq', names: ['Equatorial Guinea'], min: 9, max: 9 },
  { code: '+291', iso: 'er', names: ['Eritrea'], min: 7, max: 7 },
  { code: '+372', iso: 'ee', names: ['Estonia'], min: 7, max: 8 },
  { code: '+268', iso: 'sz', names: ['Eswatini', 'Swaziland'], min: 8, max: 8 },
  { code: '+251', iso: 'et', names: ['Ethiopia'], min: 9, max: 9 },
  { code: '+679', iso: 'fj', names: ['Fiji'], min: 7, max: 7 },
  { code: '+358', iso: 'fi', names: ['Finland'], min: 6, max: 12 },
  { code: '+33', iso: 'fr', names: ['France'], min: 9, max: 9 },
  { code: '+241', iso: 'ga', names: ['Gabon'], min: 7, max: 8 },
  { code: '+220', iso: 'gm', names: ['Gambia'], min: 7, max: 7 },
  { code: '+995', iso: 'ge', names: ['Georgia'], min: 9, max: 9 },
  { code: '+49', iso: 'de', names: ['Germany'], min: 10, max: 11 },
  { code: '+233', iso: 'gh', names: ['Ghana'], min: 9, max: 9 },
  { code: '+30', iso: 'gr', names: ['Greece'], min: 10, max: 10 },
  { code: '+1473', iso: 'gd', names: ['Grenada'], min: 7, max: 7 },
  { code: '+502', iso: 'gt', names: ['Guatemala'], min: 8, max: 8 },
  { code: '+224', iso: 'gn', names: ['Guinea'], min: 9, max: 9 },
  { code: '+245', iso: 'gw', names: ['Guinea-Bissau'], min: 7, max: 9 },
  { code: '+592', iso: 'gy', names: ['Guyana'], min: 7, max: 7 },
  { code: '+509', iso: 'ht', names: ['Haiti'], min: 8, max: 8 },
  { code: '+504', iso: 'hn', names: ['Honduras'], min: 8, max: 8 },
  { code: '+36', iso: 'hu', names: ['Hungary'], min: 8, max: 9 },
  { code: '+354', iso: 'is', names: ['Iceland'], min: 7, max: 7 },
  { code: '+91', iso: 'in', names: ['India'], min: 10, max: 10, pattern: /^[6-9]\d{9}$/ },
  { code: '+62', iso: 'id', names: ['Indonesia'], min: 9, max: 12 },
  { code: '+98', iso: 'ir', names: ['Iran'], min: 10, max: 10 },
  { code: '+964', iso: 'iq', names: ['Iraq'], min: 10, max: 10 },
  { code: '+353', iso: 'ie', names: ['Ireland'], min: 7, max: 9 },
  { code: '+972', iso: 'il', names: ['Israel'], min: 8, max: 9 },
  { code: '+39', iso: 'it', names: ['Italy'], min: 9, max: 10 },
  { code: '+1876', iso: 'jm', names: ['Jamaica'], min: 7, max: 7 },
  { code: '+81', iso: 'jp', names: ['Japan'], min: 10, max: 10 },
  { code: '+962', iso: 'jo', names: ['Jordan'], min: 9, max: 9 },
  { code: '+254', iso: 'ke', names: ['Kenya'], min: 9, max: 9 },
  { code: '+686', iso: 'ki', names: ['Kiribati'], min: 5, max: 8 },
  { code: '+965', iso: 'kw', names: ['Kuwait'], min: 8, max: 8 },
  { code: '+996', iso: 'kg', names: ['Kyrgyzstan'], min: 9, max: 9 },
  { code: '+856', iso: 'la', names: ['Laos'], min: 8, max: 10 },
  { code: '+371', iso: 'lv', names: ['Latvia'], min: 8, max: 8 },
  { code: '+961', iso: 'lb', names: ['Lebanon'], min: 7, max: 8 },
  { code: '+266', iso: 'ls', names: ['Lesotho'], min: 8, max: 8 },
  { code: '+231', iso: 'lr', names: ['Liberia'], min: 7, max: 9 },
  { code: '+218', iso: 'ly', names: ['Libya'], min: 9, max: 10 },
  { code: '+423', iso: 'li', names: ['Liechtenstein'], min: 7, max: 7 },
  { code: '+370', iso: 'lt', names: ['Lithuania'], min: 8, max: 8 },
  { code: '+352', iso: 'lu', names: ['Luxembourg'], min: 6, max: 9 },
  { code: '+261', iso: 'mg', names: ['Madagascar'], min: 9, max: 9 },
  { code: '+265', iso: 'mw', names: ['Malawi'], min: 7, max: 9 },
  { code: '+60', iso: 'my', names: ['Malaysia'], min: 9, max: 10 },
  { code: '+960', iso: 'mv', names: ['Maldives'], min: 7, max: 7 },
  { code: '+223', iso: 'ml', names: ['Mali'], min: 8, max: 8 },
  { code: '+356', iso: 'mt', names: ['Malta'], min: 8, max: 8 },
  { code: '+692', iso: 'mh', names: ['Marshall Islands'], min: 7, max: 7 },
  { code: '+222', iso: 'mr', names: ['Mauritania'], min: 8, max: 8 },
  { code: '+230', iso: 'mu', names: ['Mauritius'], min: 7, max: 8 },
  { code: '+52', iso: 'mx', names: ['Mexico'], min: 10, max: 10 },
  { code: '+691', iso: 'fm', names: ['Micronesia'], min: 7, max: 7 },
  { code: '+373', iso: 'md', names: ['Moldova'], min: 8, max: 8 },
  { code: '+377', iso: 'mc', names: ['Monaco'], min: 8, max: 9 },
  { code: '+976', iso: 'mn', names: ['Mongolia'], min: 8, max: 8 },
  { code: '+382', iso: 'me', names: ['Montenegro'], min: 8, max: 9 },
  { code: '+212', iso: 'ma', names: ['Morocco'], min: 9, max: 9 },
  { code: '+258', iso: 'mz', names: ['Mozambique'], min: 9, max: 9 },
  { code: '+95', iso: 'mm', names: ['Myanmar', 'Burma'], min: 8, max: 10 },
  { code: '+264', iso: 'na', names: ['Namibia'], min: 9, max: 9 },
  { code: '+674', iso: 'nr', names: ['Nauru'], min: 7, max: 7 },
  { code: '+977', iso: 'np', names: ['Nepal'], min: 10, max: 10 },
  { code: '+31', iso: 'nl', names: ['Netherlands'], min: 9, max: 9 },
  { code: '+64', iso: 'nz', names: ['New Zealand'], min: 8, max: 10 },
  { code: '+505', iso: 'ni', names: ['Nicaragua'], min: 8, max: 8 },
  { code: '+227', iso: 'ne', names: ['Niger'], min: 8, max: 8 },
  { code: '+234', iso: 'ng', names: ['Nigeria'], min: 10, max: 10 },
  { code: '+850', iso: 'kp', names: ['North Korea'], min: 8, max: 10 },
  { code: '+389', iso: 'mk', names: ['North Macedonia'], min: 8, max: 8 },
  { code: '+47', iso: 'no', names: ['Norway'], min: 8, max: 8 },
  { code: '+968', iso: 'om', names: ['Oman'], min: 8, max: 8 },
  { code: '+92', iso: 'pk', names: ['Pakistan'], min: 10, max: 10 },
  { code: '+680', iso: 'pw', names: ['Palau'], min: 7, max: 7 },
  { code: '+507', iso: 'pa', names: ['Panama'], min: 7, max: 8 },
  { code: '+675', iso: 'pg', names: ['Papua New Guinea'], min: 7, max: 8 },
  { code: '+595', iso: 'py', names: ['Paraguay'], min: 9, max: 9 },
  { code: '+51', iso: 'pe', names: ['Peru'], min: 9, max: 9 },
  { code: '+63', iso: 'ph', names: ['Philippines'], min: 10, max: 10 },
  { code: '+48', iso: 'pl', names: ['Poland'], min: 9, max: 9 },
  { code: '+351', iso: 'pt', names: ['Portugal'], min: 9, max: 9 },
  { code: '+974', iso: 'qa', names: ['Qatar'], min: 8, max: 8 },
  { code: '+242', iso: 'cg', names: ['Republic of the Congo', 'Congo'], min: 9, max: 9 },
  { code: '+40', iso: 'ro', names: ['Romania'], min: 9, max: 9 },
  { code: '+7', iso: 'ru', names: ['Russia', 'Kazakhstan'], min: 10, max: 10 },
  { code: '+250', iso: 'rw', names: ['Rwanda'], min: 9, max: 9 },
  { code: '+1869', iso: 'kn', names: ['Saint Kitts and Nevis'], min: 7, max: 7 },
  { code: '+1758', iso: 'lc', names: ['Saint Lucia'], min: 7, max: 7 },
  { code: '+1784', iso: 'vc', names: ['Saint Vincent and the Grenadines'], min: 7, max: 7 },
  { code: '+685', iso: 'ws', names: ['Samoa'], min: 5, max: 7 },
  { code: '+378', iso: 'sm', names: ['San Marino'], min: 6, max: 10 },
  { code: '+239', iso: 'st', names: ['Sao Tome and Principe', 'São Tomé and Príncipe'], min: 7, max: 7 },
  { code: '+966', iso: 'sa', names: ['Saudi Arabia'], min: 9, max: 9 },
  { code: '+221', iso: 'sn', names: ['Senegal'], min: 9, max: 9 },
  { code: '+381', iso: 'rs', names: ['Serbia'], min: 8, max: 9 },
  { code: '+248', iso: 'sc', names: ['Seychelles'], min: 7, max: 7 },
  { code: '+232', iso: 'sl', names: ['Sierra Leone'], min: 8, max: 8 },
  { code: '+65', iso: 'sg', names: ['Singapore'], min: 8, max: 8 },
  { code: '+421', iso: 'sk', names: ['Slovakia'], min: 9, max: 9 },
  { code: '+386', iso: 'si', names: ['Slovenia'], min: 8, max: 8 },
  { code: '+677', iso: 'sb', names: ['Solomon Islands'], min: 5, max: 7 },
  { code: '+252', iso: 'so', names: ['Somalia'], min: 7, max: 9 },
  { code: '+27', iso: 'za', names: ['South Africa'], min: 9, max: 9 },
  { code: '+82', iso: 'kr', names: ['South Korea', 'Korea'], min: 9, max: 10 },
  { code: '+211', iso: 'ss', names: ['South Sudan'], min: 9, max: 9 },
  { code: '+34', iso: 'es', names: ['Spain'], min: 9, max: 9 },
  { code: '+94', iso: 'lk', names: ['Sri Lanka'], min: 9, max: 9 },
  { code: '+249', iso: 'sd', names: ['Sudan'], min: 9, max: 9 },
  { code: '+597', iso: 'sr', names: ['Suriname'], min: 6, max: 7 },
  { code: '+46', iso: 'se', names: ['Sweden'], min: 7, max: 10 },
  { code: '+41', iso: 'ch', names: ['Switzerland'], min: 9, max: 9 },
  { code: '+963', iso: 'sy', names: ['Syria'], min: 9, max: 9 },
  { code: '+992', iso: 'tj', names: ['Tajikistan'], min: 9, max: 9 },
  { code: '+255', iso: 'tz', names: ['Tanzania'], min: 9, max: 9 },
  { code: '+66', iso: 'th', names: ['Thailand'], min: 9, max: 9 },
  { code: '+670', iso: 'tl', names: ['Timor-Leste', 'East Timor'], min: 7, max: 8 },
  { code: '+228', iso: 'tg', names: ['Togo'], min: 8, max: 8 },
  { code: '+676', iso: 'to', names: ['Tonga'], min: 5, max: 7 },
  { code: '+1868', iso: 'tt', names: ['Trinidad and Tobago'], min: 7, max: 7 },
  { code: '+216', iso: 'tn', names: ['Tunisia'], min: 8, max: 8 },
  { code: '+90', iso: 'tr', names: ['Turkey', 'Türkiye'], min: 10, max: 10 },
  { code: '+993', iso: 'tm', names: ['Turkmenistan'], min: 8, max: 8 },
  { code: '+688', iso: 'tv', names: ['Tuvalu'], min: 5, max: 7 },
  { code: '+256', iso: 'ug', names: ['Uganda'], min: 9, max: 9 },
  { code: '+380', iso: 'ua', names: ['Ukraine'], min: 9, max: 9 },
  { code: '+971', iso: 'ae', names: ['United Arab Emirates', 'UAE'], min: 9, max: 9 },
  { code: '+44', iso: 'gb', names: ['United Kingdom', 'UK', 'Great Britain'], min: 10, max: 11 },
  { code: '+1', iso: 'us', names: ['USA', 'United States', 'Canada'], min: 10, max: 10 },
  { code: '+598', iso: 'uy', names: ['Uruguay'], min: 8, max: 8 },
  { code: '+998', iso: 'uz', names: ['Uzbekistan'], min: 9, max: 9 },
  { code: '+678', iso: 'vu', names: ['Vanuatu'], min: 5, max: 7 },
  { code: '+58', iso: 've', names: ['Venezuela'], min: 10, max: 10 },
  { code: '+84', iso: 'vn', names: ['Vietnam'], min: 9, max: 10 },
  { code: '+967', iso: 'ye', names: ['Yemen'], min: 9, max: 9 },
  { code: '+260', iso: 'zm', names: ['Zambia'], min: 9, max: 9 },
  { code: '+263', iso: 'zw', names: ['Zimbabwe'], min: 9, max: 9 },
];

/** "USA / Canada" — the countries an entry covers, as the picker's list shows them. Aliases that
 * only exist for search (an old or alternate spelling of the same country) are not repeated. */
const SEARCH_ONLY_ALIASES = new Set([
  'Ivory Coast', 'Czech Republic', 'DR Congo', 'Swaziland', 'Burma', 'Congo', 'Korea',
  'São Tomé and Príncipe', 'East Timor', 'Türkiye', 'UAE', 'UK', 'Great Britain', 'United States',
]);

function displayNames(entry: DialCodeEntry): string {
  return entry.names.filter((n, i) => i === 0 || !SEARCH_ONLY_ALIASES.has(n)).join(' / ');
}

function ruleFor(entry: DialCodeEntry): PhoneRule {
  const where = displayNames(entry);
  if (entry.pattern) {
    // The one hand-written pattern today is India's; its message was written to match it.
    return { pattern: entry.pattern, message: `Enter a valid ${entry.min}-digit ${where} mobile number starting with 6-9.`, maxLen: entry.max };
  }
  const length = entry.min === entry.max ? `${entry.min}-digit` : `${entry.min}-${entry.max} digit`;
  return {
    pattern: new RegExp(`^\\d{${entry.min},${entry.max}}$`),
    message: `Enter a valid ${length} ${where} phone number.`,
    maxLen: entry.max,
  };
}

/** Per-dial-code digit rules, keyed by the code ("+91"). `other` is the loose fallback used for a
 * code typed by hand under "Other" (only the admin forms still offer that) or one not in the list. */
export const PHONE_RULES: Record<string, PhoneRule> = Object.fromEntries([
  ...DIAL_CODES.map((entry) => [entry.code, ruleFor(entry)] as const),
  ['other', { pattern: /^\d{6,15}$/, message: 'Enter a valid phone number (6-15 digits).', maxLen: 15 }],
]);

export interface CountryCodeOption {
  code: string;
  iso: string;
  emoji: string;
  /** "USA / Canada" — the country or countries this code belongs to. Empty for `other`. */
  name: string;
  /** Every spelling that should find this option when typed, including the code itself. */
  keywords: string[];
}

/** Regional-indicator pair for an ISO code — the flag emoji, on the platforms that draw one. */
function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65))
    .join('');
}

/** The dial-code select's options, alphabetical by country, with the "Other" free-text escape
 * last. Public forms hide `other` (see PhoneField's `allowOtherCode`): every country is listed, so
 * a code typed by hand could only ever be a mistake. The admin trackers keep it, for the rare
 * legacy record whose stored code is not one of these. */
export const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  ...DIAL_CODES.map((entry) => ({
    code: entry.code,
    iso: entry.iso,
    emoji: flagEmoji(entry.iso),
    name: displayNames(entry),
    keywords: [...entry.names, entry.code, entry.code.slice(1)],
  })),
  { code: 'other', iso: '', emoji: '🌐', name: '', keywords: ['Other'] },
];

export const CUSTOM_CODE_RE = /^\+\d{1,4}$/;
