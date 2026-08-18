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
