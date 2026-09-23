/**
 * Country and city data for the Region/Country and City fields in the Add/Edit Event form.
 *
 * COUNTRY_NAMES is the full sovereign-country list the Region/Country dropdown offers (the
 * dropdown is searchable, so length costs nothing). COUNTRY_CITY_DATA stays a deliberately
 * short curated map of the markets we actually run events in — a country listed there gets a
 * City dropdown, anything else falls back to a free-text City field.
 */

/**
 * Country name -> ISO 3166-1 alpha-2, the single source for both the dropdown list and the
 * flag emoji (derived from the code, so there's no second 195-entry table to keep in sync).
 *
 * Three entries deliberately keep the SHORT form this form has always used — USA, UK, UAE —
 * rather than the "United States"/"United Kingdom"/"United Arab Emirates" of the standard list.
 * (The United States was listed as "America" for a while, by request, and was switched back to
 * "USA" on 2026-09-11, also by request — "USA" is what every stored record already holds.
 * "America" is now an alias, so a record saved under it still groups and flags as USA.)
 * /events builds its section headings from this exact string (groupByCountry), so renaming them
 * would have split each of those countries into two sections for as long as records saved under
 * the old name existed. The long names are searchable aliases instead (see
 * LEGACY_COUNTRY_ALIASES) — typing "United States" still finds USA.
 */
export const COUNTRY_ISO2: Record<string, string> = {
  Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Andorra: 'AD', Angola: 'AO',
  'Antigua and Barbuda': 'AG', Argentina: 'AR', Armenia: 'AM', Australia: 'AU', Austria: 'AT',
  Azerbaijan: 'AZ', Bahamas: 'BS', Bahrain: 'BH', Bangladesh: 'BD', Barbados: 'BB',
  Belarus: 'BY', Belgium: 'BE', Belize: 'BZ', Benin: 'BJ', Bhutan: 'BT', Bolivia: 'BO',
  'Bosnia and Herzegovina': 'BA', Botswana: 'BW', Brazil: 'BR', Brunei: 'BN', Bulgaria: 'BG',
  'Burkina Faso': 'BF', Burundi: 'BI', 'Cabo Verde': 'CV', Cambodia: 'KH', Cameroon: 'CM',
  Canada: 'CA', 'Central African Republic': 'CF', Chad: 'TD', Chile: 'CL', China: 'CN',
  Colombia: 'CO', Comoros: 'KM', 'Democratic Republic of the Congo': 'CD',
  'Republic of the Congo': 'CG', 'Costa Rica': 'CR', 'Côte d’Ivoire': 'CI', Croatia: 'HR',
  Cuba: 'CU', Cyprus: 'CY', Czechia: 'CZ', Denmark: 'DK', Djibouti: 'DJ', Dominica: 'DM',
  'Dominican Republic': 'DO', Ecuador: 'EC', Egypt: 'EG', 'El Salvador': 'SV',
  'Equatorial Guinea': 'GQ', Eritrea: 'ER', Estonia: 'EE', Eswatini: 'SZ', Ethiopia: 'ET',
  Fiji: 'FJ', Finland: 'FI', France: 'FR', Gabon: 'GA', Gambia: 'GM', Georgia: 'GE',
  Germany: 'DE', Ghana: 'GH', Greece: 'GR', Grenada: 'GD', Guatemala: 'GT', Guinea: 'GN',
  'Guinea-Bissau': 'GW', Guyana: 'GY', Haiti: 'HT', Honduras: 'HN', Hungary: 'HU',
  Iceland: 'IS', India: 'IN', Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ', Ireland: 'IE',
  Israel: 'IL', Italy: 'IT', Jamaica: 'JM', Japan: 'JP', Jordan: 'JO', Kazakhstan: 'KZ',
  Kenya: 'KE', Kiribati: 'KI', Kuwait: 'KW', Kyrgyzstan: 'KG', Laos: 'LA', Latvia: 'LV',
  Lebanon: 'LB', Lesotho: 'LS', Liberia: 'LR', Libya: 'LY', Liechtenstein: 'LI',
  Lithuania: 'LT', Luxembourg: 'LU', Madagascar: 'MG', Malawi: 'MW', Malaysia: 'MY',
  Maldives: 'MV', Mali: 'ML', Malta: 'MT', 'Marshall Islands': 'MH', Mauritania: 'MR',
  Mauritius: 'MU', Mexico: 'MX', Micronesia: 'FM', Moldova: 'MD', Monaco: 'MC',
  Mongolia: 'MN', Montenegro: 'ME', Morocco: 'MA', Mozambique: 'MZ', Myanmar: 'MM',
  Namibia: 'NA', Nauru: 'NR', Nepal: 'NP', Netherlands: 'NL', 'New Zealand': 'NZ',
  Nicaragua: 'NI', Niger: 'NE', Nigeria: 'NG', 'North Korea': 'KP', 'North Macedonia': 'MK',
  Norway: 'NO', Oman: 'OM', Pakistan: 'PK', Palau: 'PW', Palestine: 'PS', Panama: 'PA',
  'Papua New Guinea': 'PG', Paraguay: 'PY', Peru: 'PE', Philippines: 'PH', Poland: 'PL',
  Portugal: 'PT', Qatar: 'QA', Romania: 'RO', Russia: 'RU', Rwanda: 'RW',
  'Saint Kitts and Nevis': 'KN', 'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC', Samoa: 'WS', 'San Marino': 'SM',
  'São Tomé and Príncipe': 'ST', 'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS',
  Seychelles: 'SC', 'Sierra Leone': 'SL', Singapore: 'SG', Slovakia: 'SK', Slovenia: 'SI',
  'Solomon Islands': 'SB', Somalia: 'SO', 'South Africa': 'ZA', 'South Korea': 'KR',
  'South Sudan': 'SS', Spain: 'ES', 'Sri Lanka': 'LK', Sudan: 'SD', Suriname: 'SR',
  Sweden: 'SE', Switzerland: 'CH', Syria: 'SY', Tajikistan: 'TJ', Tanzania: 'TZ',
  Thailand: 'TH', 'Timor-Leste': 'TL', Togo: 'TG', Tonga: 'TO',
  'Trinidad and Tobago': 'TT', Tunisia: 'TN', 'Türkiye': 'TR', Turkmenistan: 'TM',
  Tuvalu: 'TV', Uganda: 'UG', UAE: 'AE', UK: 'GB', Ukraine: 'UA', USA: 'US',
  Uruguay: 'UY', Uzbekistan: 'UZ',
  Vanuatu: 'VU', 'Vatican City / Holy See': 'VA', Venezuela: 'VE', Vietnam: 'VN',
  Yemen: 'YE', Zambia: 'ZM', Zimbabwe: 'ZW',
};

/**
 * Alternative spellings — both the standard long names for the three countries this form keeps
 * in short form, and older/looser spellings that exist in saved records or that an admin may
 * type via "Others…". Each maps to the canonical name above, which does three jobs: the variant
 * still gets a flag, it's matched when searching the dropdown (aliasesForCountry), and reopening
 * a record holding one snaps the field to the canonical entry (canonicalCountryName) so /events
 * stops splitting one country across two section headings.
 *
 * Territories not on the sovereign list (Hong Kong, Taiwan, Kosovo, Macau) aren't dropdown
 * options, but a record already holding one keeps its flag — see NON_SOVEREIGN_ISO2.
 */
const LEGACY_COUNTRY_ALIASES: Record<string, string> = {
  // 'USA' is the canonical name again (it was 'America' for a while). 'America' stays as an alias
  // so any record saved while it was canonical still groups under USA on /events — rather than
  // splitting into a second "America" section — and snaps back to USA when reopened in the admin
  // form. scripts/migrations/rename-america-to-usa.sql rewrites such rows in one pass.
  America: 'USA', 'United States': 'USA', 'United States of America': 'USA',
  US: 'USA', 'U.S.': 'USA', 'U.S.A.': 'USA',
  'United Kingdom': 'UK', 'Great Britain': 'UK', 'Britain': 'UK',
  'United Arab Emirates': 'UAE', 'U.A.E.': 'UAE',
  Turkey: 'Türkiye', 'Czech Republic': 'Czechia', 'Ivory Coast': 'Côte d’Ivoire',
  'Cape Verde': 'Cabo Verde', 'East Timor': 'Timor-Leste', Swaziland: 'Eswatini',
  Burma: 'Myanmar', Holland: 'Netherlands', 'Vatican City': 'Vatican City / Holy See',
  'Sao Tome and Principe': 'São Tomé and Príncipe', 'Korea': 'South Korea',
  'Republic of Korea': 'South Korea',
  // Records entered as the CONTINENT where the country was meant — see the Johannesburg events.
  // Deliberate caveat: this cannot tell a genuinely pan-African entry from a South African one,
  // so anything actually elsewhere in Africa must carry its own country (row #79 was corrected to
  // Kenya for exactly this reason).
  Africa: 'South Africa',
};

/** Extra ISO codes for names that aren't dropdown options but do turn up in saved records. */
const NON_SOVEREIGN_ISO2: Record<string, string> = {
  'Hong Kong': 'HK', Taiwan: 'TW', Macau: 'MO', Kosovo: 'XK', 'Puerto Rico': 'PR',
};

/** The Region/Country dropdown list — every sovereign country, alphabetical. */
export const COUNTRY_NAMES: string[] = Object.keys(COUNTRY_ISO2).sort((a, b) => a.localeCompare(b));

/**
 * Curated country → major-cities list. Only the markets we actually list events in: a country
 * here gets a City dropdown, everything else falls back to a free-text City field, which is
 * why this stays short rather than growing to match COUNTRY_NAMES.
 */
export const COUNTRY_CITY_DATA: Record<string, string[]> = {
  India: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Pune'],
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

/* ============================================================
   SUB-CITIES
   ============================================================ */

/**
 * City → the sub-cities it can be narrowed to in the Add/Edit Event form's "Select Sub City"
 * dropdown, which appears next to City only for a city listed here.
 *
 * The point of the split: Gurugram and Noida events belong in the Delhi NCR section on /events
 * (one carousel for the whole region, not three), but their CARDS should say where the event
 * actually is. So the sub-city is what gets stored in `city` and shown on the card, while the
 * grouping key comes from SUB_CITY_PARENT below. That's also why Gurugram and Noida were
 * removed from COUNTRY_CITY_DATA.India — picking them there would have made them top-level
 * cities again, which is exactly the split this replaces.
 */
export const CITY_SUB_CITY_DATA: Record<string, string[]> = {
  'Delhi NCR': ['Delhi', 'Gurugram', 'Noida', 'Faridabad', 'Ghaziabad'],
};

/**
 * Sub-city → its parent city, i.e. the section it groups under on /events. Includes spellings
 * that aren't offered in the dropdown but exist in saved records ("New Delhi", "Gurgaon"), so
 * those group correctly without anyone having to re-save them.
 */
const SUB_CITY_PARENT: Record<string, string> = {
  ...Object.entries(CITY_SUB_CITY_DATA).reduce((acc, [parent, subs]) => {
    for (const sub of subs) acc[sub.toLowerCase()] = parent;
    return acc;
  }, {} as Record<string, string>),
  'new delhi': 'Delhi NCR',
  gurgaon: 'Delhi NCR',
};

/** The sub-cities offered for a city, or null when it has none (the usual case — the form then
 * shows no Sub City dropdown at all). */
export function subCitiesForCity(city: string): string[] | null {
  return CITY_SUB_CITY_DATA[city.trim()] || null;
}

/** The city a sub-city groups under, or null when the value isn't a sub-city. Used both by the
 * public /events grouping and by the admin form to work out which City to preselect. */
export function parentCityForSubCity(value: string): string | null {
  return SUB_CITY_PARENT[(value || '').trim().toLowerCase()] || null;
}

/**
 * Splits a single stored `city` value into the two fields the form edits.
 *
 * One field is stored, two are shown: "Gurugram" is saved, and the form renders City="Delhi NCR"
 * + Sub City="Gurugram". Keeping it to one column means no schema change and means records
 * already saved as "Gurugram"/"Noida"/"New Delhi" pick up the new grouping for free.
 */
export function splitCityValue(stored: string): { city: string; subCity: string } {
  const value = (stored || '').trim();
  const parent = parentCityForSubCity(value);
  return parent ? { city: parent, subCity: value } : { city: value, subCity: '' };
}

export function citiesForCountry(country: string): string[] | null {
  return COUNTRY_CITY_DATA[country] || COUNTRY_CITY_DATA[canonicalCountryName(country)] || null;
}

/** Reverse lookup — given a city name, finds which country's list contains it. Used to recover
 * the Region/Country field for old records that predate this form having a dedicated Country
 * field of its own, where only a city (via the linked website Event's `location`) survived.
 * Sub-cities resolve through their parent, so "Gurugram" still recovers India even though it is
 * no longer a top-level entry in COUNTRY_CITY_DATA. */
export function countryForCity(city: string): string | null {
  if (!city) return null;
  const name = parentCityForSubCity(city) || city.trim();
  for (const [country, cities] of Object.entries(COUNTRY_CITY_DATA)) {
    if (cities.includes(name)) return country;
  }
  return null;
}

/**
 * The section a city without its own listing falls under on /events, shown as a heading beneath
 * the country. A country that lists events in a handful of one-off cities used to get one
 * single-card carousel per city; they all share this one carousel instead, each card still
 * naming its own city.
 *
 * Membership is derived, not stored, and it depends on ONE thing only: how many events that city
 * currently has listed. Below AUTO_SECTION_MIN_EVENTS it sits here; at or above it, it gets its
 * own heading. Being curated in COUNTRY_CITY_DATA no longer exempts a city — that list controls
 * what the admin City dropdown offers, nothing more. Giving a city its own section on the site
 * therefore means listing enough events in it, not editing a list here.
 */
export const OTHER_CITIES_SECTION = 'Other Cities';

/**
 * How many listed events a city needs before it earns its own carousel instead of sitting in
 * "Other Cities". Counted from the events actually on the page (upcoming only), so a city can
 * fall back into Other Cities once its events pass — the section always reflects what is
 * currently listed rather than a historical high-water mark.
 *
 * Applies to EVERY city, curated or not. It used to apply only to uncurated ones, which is why
 * single-event sections such as Kochi, Boston, Jeddah and Abu Dhabi kept their own one-card
 * carousels — exactly the thing "Other Cities" exists to prevent.
 */
export const AUTO_SECTION_MIN_EVENTS = 3;

/**
 * The "does this city get its own carousel?" rule: purely how many events it currently has
 * listed. Two or fewer and it shares its country's "Other Cities" carousel; the third event
 * gives it a heading of its own, and losing one takes it away again.
 *
 * Curation deliberately plays no part. It used to (`isOwnSectionCity(...) ||`), which meant a
 * curated city with a single event still rendered a one-card carousel while an uncurated city
 * with two was merged — two different answers to the same question, decided by a hand-edited
 * list rather than by what is actually on the page.
 *
 * Takes the count alone so there is no way to reintroduce that asymmetry by passing a city in.
 */
export function citySectionQualifies(eventCount: number): boolean {
  return eventCount >= AUTO_SECTION_MIN_EVENTS;
}

/** Whether `city` is one of the curated cities listed for `country` in COUNTRY_CITY_DATA.
 *
 * This is a question about the admin City DROPDOWN — which cities it offers ready-made — not
 * about /events sections; those are decided by citySectionQualifies on event count alone.
 * Sub-cities resolve through their parent, so Gurugram counts as Delhi NCR. */
export function isOwnSectionCity(country: string, city: string): boolean {
  const name = (city || '').trim();
  if (!name) return false;
  const curated = citiesForCountry(country);
  if (!curated) return false;
  return curated.includes(parentCityForSubCity(name) || name);
}

/**
 * Cities that have EARNED a dropdown slot by reaching AUTO_SECTION_MIN_EVENTS listed events,
 * grouped by canonical country name. Curated cities are excluded — they are already offered.
 *
 * Same threshold and same input (currently-listed events) as the /events section rule, so a city
 * that has earned its own heading is also offered by name in the dropdown, and stops being
 * offered once its events pass and it drops back below three. Curated cities are the one
 * asymmetry, and only here: they are always offered by the dropdown regardless of count, while
 * on /events they are merged into "Other Cities" like anything else until they reach three.
 *
 * Sub-cities fold into their parent first (Gurugram counts toward Delhi NCR), and cities are
 * counted case-insensitively with the first spelling seen used as the label — otherwise
 * "guangzhou" and "Guangzhou" would each sit below the threshold and neither would qualify.
 */
export function promotedCitiesByCountry(
  rows: { country?: string | null; city?: string | null }[]
): Record<string, string[]> {
  const counts = new Map<string, Map<string, { label: string; n: number }>>();
  for (const row of rows) {
    const country = canonicalCountryName(row.country || '');
    const rawCity = (row.city || '').trim();
    if (!country || !rawCity) continue;
    const city = parentCityForSubCity(rawCity) ?? rawCity;
    if (isOwnSectionCity(country, city)) continue;
    const byCity = counts.get(country) ?? new Map();
    const key = city.toLowerCase();
    const hit = byCity.get(key) ?? { label: city, n: 0 };
    hit.n += 1;
    byCity.set(key, hit);
    counts.set(country, byCity);
  }
  const out: Record<string, string[]> = {};
  for (const [country, byCity] of counts) {
    const cities = [...byCity.values()]
      .filter((c) => c.n >= AUTO_SECTION_MIN_EVENTS)
      .map((c) => c.label)
      .sort((a, b) => a.localeCompare(b));
    if (cities.length) out[country] = cities;
  }
  return out;
}

/**
 * The City dropdown's full option list: the curated cities for `country` plus any that have
 * earned a slot (promotedCitiesByCountry). Returns null only when there is nothing to offer at
 * all, which is the signal both forms use to fall back to free-text entry.
 */
export function cityOptionsForCountry(
  country: string,
  promoted?: Record<string, string[]> | null
): string[] | null {
  const curated = citiesForCountry(country);
  const earned = promoted?.[canonicalCountryName(country)] ?? [];
  if (!curated) return earned.length ? [...earned] : null;
  return earned.length ? [...curated, ...earned] : curated;
}

/**
 * Countries where the city legitimately shares the country's name. Without this, the
 * location-check below would flag Singapore/Singapore and Hong Kong/Hong Kong as mistakes.
 */
const CITY_STATE_COUNTRIES = new Set(['Singapore', 'Hong Kong', 'Macau', 'Monaco', 'Malta', 'Bahrain', 'Vatican City / Holy See']);

/** Labels that aren't a country but ARE valid in the Region/Country field. */
const NON_COUNTRY_REGIONS = new Set(['Online', 'Cohort', 'International Events', 'Other Cities']);

/** Whether a string is a country this codebase recognises (canonical name, alias or territory). */
export function isKnownCountry(value: string): boolean {
  const name = canonicalCountryName(value);
  return !!name && (name in COUNTRY_ISO2 || name in NON_SOVEREIGN_ISO2);
}

/** Sovereign countries only — excludes territories like Macau and Hong Kong, which are perfectly
 * good CITY values (Macau is a city in China) and must not be flagged as "a country in the City
 * field". */
function isSovereignCountry(value: string): boolean {
  return canonicalCountryName(value) in COUNTRY_ISO2;
}

/**
 * Why an event's Region/Country + City pair looks wrong, or '' when it looks fine. Powers the
 * Partnership Tracker's location warning so these can be found and corrected by hand — the values
 * arrive from free-text entry and CSV import, so the table accumulates things like a blank
 * country, a continent ("Africa"), a city used as the country ("Mumbai"), or a country name
 * sitting in the City field ("USA", "Egypt").
 */
export function locationIssue(country: string, city: string): string {
  const rawCountry = (country || '').trim();
  const rawCity = (city || '').trim();
  if (!rawCountry) return 'No Region/Country set';
  if (NON_COUNTRY_REGIONS.has(canonicalCountryName(rawCountry))) return '';
  if (!isKnownCountry(rawCountry)) return `"${rawCountry}" is not a recognised country`;
  if (rawCity && isSovereignCountry(rawCity) && !CITY_STATE_COUNTRIES.has(canonicalCountryName(rawCountry))) {
    return `City "${rawCity}" is a country name, not a city`;
  }
  return '';
}

const CANONICAL_BY_LOWER_NAME = new Map<string, string>([
  ...Object.keys(COUNTRY_ISO2).map((n) => [n.toLowerCase(), n] as [string, string]),
  ...Object.keys(NON_SOVEREIGN_ISO2).map((n) => [n.toLowerCase(), n] as [string, string]),
  ...Object.entries(LEGACY_COUNTRY_ALIASES).map(([alias, name]) => [alias.toLowerCase(), name] as [string, string]),
]);

/**
 * Snaps a stored country to its canonical dropdown spelling — handles case/whitespace variants
 * ("usa ") and legacy names ("USA", "Turkey") alike. Returns the input trimmed but otherwise
 * untouched when it isn't recognised, so genuinely custom values ("Cohort", "Online") survive.
 */
export function canonicalCountryName(country: string): string {
  const trimmed = (country || '').trim();
  if (!trimmed) return '';
  return CANONICAL_BY_LOWER_NAME.get(trimmed.toLowerCase()) || trimmed;
}

/** Canonical name → every alternative spelling that maps to it, e.g. USA → ["United States",
 * "United States of America", "US"]. The Region/Country dropdown feeds these to its search box
 * as hidden keywords, so typing "united states" finds the option labelled "USA". */
const ALIASES_BY_CANONICAL: Record<string, string[]> = Object.entries(LEGACY_COUNTRY_ALIASES)
  .reduce((acc, [alias, canonical]) => {
    (acc[canonical] ||= []).push(alias);
    return acc;
  }, {} as Record<string, string[]>);

export function aliasesForCountry(country: string): string[] {
  return ALIASES_BY_CANONICAL[canonicalCountryName(country)] || [];
}

/** ISO alpha-2 → regional-indicator flag emoji ('IN' → 🇮🇳). */
function flagFromIso2(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Country name → flag emoji, for the Region/Country dropdown in the Add/Edit Event form. */
export const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries({ ...COUNTRY_ISO2, ...NON_SOVEREIGN_ISO2 }).map(([name, code]) => [name, flagFromIso2(code)])
);

/** Flag emoji for a country name, or '' when it isn't recognised — callers render `flag + name`
 * so an unknown country degrades to just its name rather than showing a placeholder box. */
export function flagForCountry(country: string): string {
  return COUNTRY_FLAGS[canonicalCountryName(country)] || '';
}
