/**
 * Static country → major-cities list for the Region/Country and City fields in the
 * Add/Edit Event form. Deliberately a short, curated list (~15 countries) rather than
 * an exhaustive one — anything not listed here is covered by the "Others" option, which
 * opens a free-text field for both the country and its city.
 */
export const COUNTRY_CITY_DATA: Record<string, string[]> = {
  India: [
    'Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
    'Ahmedabad', 'Jaipur', 'Gurugram', 'Noida', 'Chandigarh', 'Kochi', 'Goa',
  ],
  USA: ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Austin', 'Boston', 'Seattle', 'Washington DC'],
  UK: ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
  UAE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  Singapore: ['Singapore'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  France: ['Paris', 'Lyon', 'Marseille'],
  Netherlands: ['Amsterdam', 'Rotterdam', 'The Hague'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  Canada: ['Toronto', 'Vancouver', 'Montreal'],
  'Saudi Arabia': ['Riyadh', 'Jeddah'],
  China: ['Shanghai', 'Beijing', 'Shenzhen'],
  Japan: ['Tokyo', 'Osaka'],
  'South Africa': ['Johannesburg', 'Cape Town'],
  Ireland: ['Dublin', 'Cork'],
};

export const COUNTRY_NAMES: string[] = Object.keys(COUNTRY_CITY_DATA).sort((a, b) => a.localeCompare(b));

export function citiesForCountry(country: string): string[] | null {
  return COUNTRY_CITY_DATA[country] || null;
}

/** Reverse lookup — given a city name, finds which country's list contains it. Used to recover
 * the Region/Country field for old records that predate this form having a dedicated Country
 * field of its own, where only a city (via the linked website Event's `location`) survived. */
export function countryForCity(city: string): string | null {
  if (!city) return null;
  for (const [country, cities] of Object.entries(COUNTRY_CITY_DATA)) {
    if (cities.includes(city)) return country;
  }
  return null;
}

/**
 * Country name → flag emoji, for the Region/Country dropdown in the Add/Edit Event form.
 *
 * Covers every country in COUNTRY_CITY_DATA above, plus a wider set of countries an admin may
 * type in via "Others…" — the dropdown keeps whatever value a record already holds, so a
 * custom country still gets its flag instead of sitting there bare next to the curated ones.
 * One canonical name per country: no alternative spellings. A name that doesn't match returns
 * '' from flagForCountry and simply renders without a flag.
 */
export const COUNTRY_FLAGS: Record<string, string> = {
  // Curated list (COUNTRY_CITY_DATA)
  India: '🇮🇳', USA: '🇺🇸', UK: '🇬🇧', UAE: '🇦🇪', Singapore: '🇸🇬',
  Germany: '🇩🇪', France: '🇫🇷', Netherlands: '🇳🇱', Australia: '🇦🇺', Canada: '🇨🇦',
  'Saudi Arabia': '🇸🇦', China: '🇨🇳', Japan: '🇯🇵', 'South Africa': '🇿🇦', Ireland: '🇮🇪',
  // Commonly added via "Others…"
  Vietnam: '🇻🇳', Indonesia: '🇮🇩', Thailand: '🇹🇭', Malaysia: '🇲🇾', Philippines: '🇵🇭',
  'South Korea': '🇰🇷', Taiwan: '🇹🇼', 'Hong Kong': '🇭🇰', Macau: '🇲🇴',
  Brazil: '🇧🇷', Mexico: '🇲🇽', Argentina: '🇦🇷', Chile: '🇨🇱', Colombia: '🇨🇴',
  Spain: '🇪🇸', Italy: '🇮🇹', Portugal: '🇵🇹', Switzerland: '🇨🇭', Austria: '🇦🇹',
  Belgium: '🇧🇪', Sweden: '🇸🇪', Norway: '🇳🇴', Denmark: '🇩🇰', Finland: '🇫🇮',
  Poland: '🇵🇱', Greece: '🇬🇷', 'Czech Republic': '🇨🇿', Hungary: '🇭🇺',
  Romania: '🇷🇴', Estonia: '🇪🇪', Lithuania: '🇱🇹', Latvia: '🇱🇻', Ukraine: '🇺🇦',
  Russia: '🇷🇺', Turkey: '🇹🇷', Israel: '🇮🇱', Egypt: '🇪🇬', Morocco: '🇲🇦',
  Nigeria: '🇳🇬', Kenya: '🇰🇪', Ghana: '🇬🇭', Ethiopia: '🇪🇹', Tanzania: '🇹🇿',
  Qatar: '🇶🇦', Kuwait: '🇰🇼', Bahrain: '🇧🇭', Oman: '🇴🇲', Jordan: '🇯🇴', Lebanon: '🇱🇧',
  Pakistan: '🇵🇰', Bangladesh: '🇧🇩', 'Sri Lanka': '🇱🇰', Nepal: '🇳🇵', Bhutan: '🇧🇹',
  Maldives: '🇲🇻', 'New Zealand': '🇳🇿', Fiji: '🇫🇯', Armenia: '🇦🇲', Georgia: '🇬🇪',
  Kazakhstan: '🇰🇿', Uzbekistan: '🇺🇿', Azerbaijan: '🇦🇿', Iceland: '🇮🇸', Luxembourg: '🇱🇺',
  Cyprus: '🇨🇾', Malta: '🇲🇹', Croatia: '🇭🇷', Serbia: '🇷🇸', Bulgaria: '🇧🇬', Slovakia: '🇸🇰',
  Slovenia: '🇸🇮',
};

const FLAG_BY_LOWER_NAME = new Map(
  Object.entries(COUNTRY_FLAGS).map(([name, flag]) => [name.toLowerCase(), flag])
);

/** Flag emoji for a country name, or '' when it isn't recognised — callers render `flag + name`
 * so an unknown country degrades to just its name rather than showing a placeholder box. */
export function flagForCountry(country: string): string {
  if (!country) return '';
  return FLAG_BY_LOWER_NAME.get(country.trim().toLowerCase()) || '';
}
