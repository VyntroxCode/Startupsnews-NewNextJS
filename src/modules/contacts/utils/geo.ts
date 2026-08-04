/**
 * City/country canonicalization, ported from clean_contacts.py's
 * CITY_CANON / COUNTRY_CANON / extract_city / extract_country.
 *
 * Without this, "Bangalore" and "Bengaluru" (or "Gurgaon"/"Gurugram") end up
 * as two different filter values for the same city -- this collapses known
 * spelling variants to one canonical form and can also pull a city/country
 * out of a full free-text address cell.
 */
import { cleanText } from './text-clean';

// canonical spelling on the right; variants on the left all normalize to it
const CITY_CANON: Record<string, string> = {
  bangalore: 'Bengaluru', bengaluru: 'Bengaluru', bengaluroo: 'Bengaluru',
  gurgaon: 'Gurugram', gurugram: 'Gurugram',
  bombay: 'Mumbai', mumbai: 'Mumbai', 'navi mumbai': 'Navi Mumbai',
  calcutta: 'Kolkata', kolkata: 'Kolkata',
  madras: 'Chennai', chennai: 'Chennai',
  poona: 'Pune', pune: 'Pune',
  'new delhi': 'New Delhi', delhi: 'Delhi', ncr: 'Delhi NCR',
  noida: 'Noida', 'greater noida': 'Greater Noida', ghaziabad: 'Ghaziabad',
  faridabad: 'Faridabad',
  hyderabad: 'Hyderabad', secunderabad: 'Hyderabad',
  ahmedabad: 'Ahmedabad', amdavad: 'Ahmedabad',
  trivandrum: 'Thiruvananthapuram', thiruvananthapuram: 'Thiruvananthapuram',
  cochin: 'Kochi', kochi: 'Kochi', ernakulam: 'Kochi',
  vizag: 'Visakhapatnam', visakhapatnam: 'Visakhapatnam',
  pondicherry: 'Puducherry', puducherry: 'Puducherry',
  mysore: 'Mysuru', mysuru: 'Mysuru',
  mangalore: 'Mangaluru', mangaluru: 'Mangaluru',
  baroda: 'Vadodara', vadodara: 'Vadodara',
};
// additional well-known cities (canonical form = themselves)
const MORE_CITIES = [
  'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Patna', 'Ranchi', 'Raipur',
  'Chandigarh', 'Mohali', 'Panchkula', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Surat', 'Rajkot',
  'Nashik', 'Aurangabad', 'Kolhapur', 'Goa', 'Panaji', 'Vasco', 'Coimbatore', 'Madurai',
  'Tiruchirappalli', 'Salem', 'Vellore', 'Guwahati', 'Bhubaneswar', 'Cuttack', 'Dehradun',
  'Haridwar', 'Rishikesh', 'Shimla', 'Jammu', 'Srinagar', 'Udaipur', 'Jodhpur', 'Kota', 'Ajmer',
  'Bikaner', 'Gwalior', 'Jabalpur', 'Ujjain', 'Varanasi', 'Allahabad', 'Prayagraj', 'Agra', 'Meerut',
  'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Siliguri',
  'Durgapur', 'Asansol', 'Howrah', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Warangal',
  'Hubli', 'Belgaum', 'Davangere', 'Tumkur', 'Shimoga', 'Thrissur', 'Kozhikode', 'Calicut',
  'Kollam', 'Kottayam', 'Palakkad', 'Tiruppur', 'Erode', 'Thoothukudi', 'Dindigul', 'Anand',
  'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Solapur', 'Sangli', 'Satara', 'Amravati',
  'Nanded', 'Latur', 'Akola', 'Jalgaon', 'Ratlam', 'Sagar', 'Rewa', 'Bilaspur', 'Korba', 'Rourkela',
  'Sambalpur', 'Puri', 'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Darbhanga', 'Hisar', 'Rohtak', 'Panipat',
  'Karnal', 'Ambala', 'Sonipat', 'Yamunanagar', 'Bathinda', 'Patiala', 'Pathankot', 'Kurukshetra',
  'Dubai', 'Abu Dhabi', 'Sharjah', 'Singapore', 'London', 'New York', 'San Francisco',
];
const CITY_LOOKUP: Record<string, string> = { ...CITY_CANON };
for (const c of MORE_CITIES) {
  const key = c.toLowerCase();
  if (!(key in CITY_LOOKUP)) CITY_LOOKUP[key] = c;
}
// match longer names first (e.g. "navi mumbai" before "mumbai")
const CITY_KEYS = Object.keys(CITY_LOOKUP).sort((a, b) => b.length - a.length);

// which country each recognized city belongs to, so a country can be inferred
// even when the sheet only ever gave a city ("Dubai" -> UAE, "Jaipur" -> India)
const FOREIGN_CITY_COUNTRY: Record<string, string> = {
  Dubai: 'UAE', 'Abu Dhabi': 'UAE', Sharjah: 'UAE',
  Singapore: 'Singapore', London: 'UK',
  'New York': 'USA', 'San Francisco': 'USA',
};
const INDIAN_CITY_SET = new Set(Object.values(CITY_LOOKUP));

export function countryForCity(city: string): string {
  if (!city) return '';
  if (city in FOREIGN_CITY_COUNTRY) return FOREIGN_CITY_COUNTRY[city];
  if (INDIAN_CITY_SET.has(city)) return 'India';
  return '';
}

export const COUNTRY_CANON: Record<string, string> = {
  india: 'India', bharat: 'India',
  uae: 'UAE', 'u.a.e': 'UAE', 'united arab emirates': 'UAE', emirates: 'UAE',
  usa: 'USA', 'u.s.a': 'USA', 'united states': 'USA', 'united states of america': 'USA', america: 'USA',
  uk: 'UK', 'u.k': 'UK', 'united kingdom': 'UK', england: 'UK', 'great britain': 'UK', britain: 'UK',
  singapore: 'Singapore', australia: 'Australia', canada: 'Canada',
  germany: 'Germany', deutschland: 'Germany', france: 'France',
  'saudi arabia': 'Saudi Arabia', ksa: 'Saudi Arabia', saudi: 'Saudi Arabia',
  qatar: 'Qatar', oman: 'Oman', kuwait: 'Kuwait', bahrain: 'Bahrain',
  italy: 'Italy', italia: 'Italy', japan: 'Japan', china: 'China', prc: 'China',
  spain: 'Spain', espana: 'Spain', portugal: 'Portugal',
  netherlands: 'Netherlands', holland: 'Netherlands', 'the netherlands': 'Netherlands',
  belgium: 'Belgium', switzerland: 'Switzerland', austria: 'Austria',
  sweden: 'Sweden', norway: 'Norway', denmark: 'Denmark', finland: 'Finland',
  ireland: 'Ireland', poland: 'Poland', russia: 'Russia', 'russian federation': 'Russia',
  ukraine: 'Ukraine', greece: 'Greece', turkey: 'Turkey', turkiye: 'Turkey',
  israel: 'Israel', egypt: 'Egypt', 'south africa': 'South Africa',
  nigeria: 'Nigeria', kenya: 'Kenya', ghana: 'Ghana', zambia: 'Zambia',
  morocco: 'Morocco', tunisia: 'Tunisia', jordan: 'Jordan', lebanon: 'Lebanon',
  iraq: 'Iraq', iran: 'Iran', pakistan: 'Pakistan', bangladesh: 'Bangladesh',
  'sri lanka': 'Sri Lanka', nepal: 'Nepal', indonesia: 'Indonesia', malaysia: 'Malaysia',
  thailand: 'Thailand', philippines: 'Philippines', vietnam: 'Vietnam', 'viet nam': 'Vietnam',
  'south korea': 'South Korea', korea: 'South Korea', 'republic of korea': 'South Korea',
  'hong kong': 'Hong Kong', taiwan: 'Taiwan', 'new zealand': 'New Zealand',
  mexico: 'Mexico', brazil: 'Brazil', argentina: 'Argentina', chile: 'Chile',
  colombia: 'Colombia', peru: 'Peru',
};
const COUNTRY_KEYS = Object.keys(COUNTRY_CANON).sort((a, b) => b.length - a.length);

// Maps the canonical country names above to ISO-3166 alpha-2 codes, so the
// phone normalizer can ask libphonenumber-js to parse a no-"+" number using
// that country's own domestic dialing rules.
export const COUNTRY_TO_ISO2: Record<string, string> = {
  India: 'IN', UAE: 'AE', USA: 'US', UK: 'GB', Singapore: 'SG',
  Australia: 'AU', Canada: 'CA', Germany: 'DE', France: 'FR',
  'Saudi Arabia': 'SA', Qatar: 'QA', Oman: 'OM', Kuwait: 'KW',
  Bahrain: 'BH', Italy: 'IT', Japan: 'JP', China: 'CN',
  Spain: 'ES', Portugal: 'PT', Netherlands: 'NL', Belgium: 'BE',
  Switzerland: 'CH', Austria: 'AT', Sweden: 'SE', Norway: 'NO',
  Denmark: 'DK', Finland: 'FI', Ireland: 'IE', Poland: 'PL',
  Russia: 'RU', Ukraine: 'UA', Greece: 'GR', Turkey: 'TR',
  Israel: 'IL', Egypt: 'EG', 'South Africa': 'ZA', Nigeria: 'NG',
  Kenya: 'KE', Ghana: 'GH', Zambia: 'ZM', Morocco: 'MA',
  Tunisia: 'TN', Jordan: 'JO', Lebanon: 'LB', Iraq: 'IQ',
  Iran: 'IR', Pakistan: 'PK', Bangladesh: 'BD', 'Sri Lanka': 'LK',
  Nepal: 'NP', Indonesia: 'ID', Malaysia: 'MY', Thailand: 'TH',
  Philippines: 'PH', Vietnam: 'VN', 'South Korea': 'KR',
  'Hong Kong': 'HK', Taiwan: 'TW', 'New Zealand': 'NZ', Mexico: 'MX',
  Brazil: 'BR', Argentina: 'AR', Chile: 'CL', Colombia: 'CO', Peru: 'PE',
};

/** Find a recognized country name anywhere in the cell (handles a full address that
 * ends in the country). Rejects emails, same as extractCity. */
export function extractCountry(raw: unknown): string {
  const s = cleanText(raw);
  if (!s || s.includes('@')) return '';
  const low = s.toLowerCase();
  for (const key of COUNTRY_KEYS) {
    if (new RegExp(`\\b${escapeRe(key)}\\b`).test(low)) return COUNTRY_CANON[key];
  }
  return '';
}

/** From a city cell that may be a full address, return just the known city.
 * Rejects values that are clearly NOT a city (emails, phone numbers, long
 * free-text sentences). Only returns a recognized city, a short place-like
 * string, or blank. */
export function extractCity(raw: unknown): string {
  const s = cleanText(raw);
  if (!s) return '';
  if (s.includes('@')) return '';
  if (/^[\W\d]+$/.test(s)) return ''; // only symbols/numbers
  const digits = s.replace(/\D/g, '');
  const nonPhoneChars = s.replace(/[\d\s\-+().]/g, '');
  if (digits.length >= 8 && nonPhoneChars.length <= 2) return ''; // basically a phone number
  const low = s.toLowerCase();
  for (const key of CITY_KEYS) {
    if (new RegExp(`\\b${escapeRe(key)}\\b`).test(low)) return CITY_LOOKUP[key];
  }
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 6) return '';
  if (/[.!?](\s|$)/.test(s) && words.length > 3) return '';
  return s;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
