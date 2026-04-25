/**
 * Client-safe events constants (no DB/Redis imports).
 * Use this in 'use client' components instead of data-adapter.
 */

export const EVENTS_REGION_ORDER = [
  "Africa",
  "Amsterdam",
  "Australia",
  "Bengaluru",
  "Berlin",
  "China",
  "Cohort",
  "Delhi NCR",
  "Dubai",
  "Ghana",
  "Hyderabad",
  "International Events",
  "Kuwait",
  "Madrid",
  "Malaysia",
  "Mumbai",
  "Philippines",
  "Riyadh",
  "Singapore",
  "Switzerland",
  "Thailand",
  "Turkey",
  "UK",
  "USA",
  "Kazakhstan",
  "Egypt",
  "Japan",
  "Germany",
  "Armenia",
  "Ahmedabad",
  "Alibhag",
  "Chennai",
  "Jaipur",
  "Nalgonda",
  "West Bengal",
  "Pune",
  "Other Cities",
  "Online",
] as const;

/** Map common location variants to canonical region (must match EVENTS_REGION_ORDER). */
const LOCATION_TO_REGION: Record<string, (typeof EVENTS_REGION_ORDER)[number]> = {
  africa: 'Africa',
  amsterdam: 'Amsterdam',
  australia: 'Australia',
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  berlin: 'Berlin',
  china: 'China',
  delhi: 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  ncr: 'Delhi NCR',
  gurgaon: 'Delhi NCR',
  gurugram: 'Delhi NCR',
  noida: 'Delhi NCR',
  faridabad: 'Delhi NCR',
  dubai: 'Dubai',
  ghana: 'Ghana',
  hyderabad: 'Hyderabad',
  kuwait: 'Kuwait',
  madrid: 'Madrid',
  malaysia: 'Malaysia',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  philippines: 'Philippines',
  riyadh: 'Riyadh',
  singapore: 'Singapore',
  switzerland: 'Switzerland',
  thailand: 'Thailand',
  turkey: 'Turkey',
  uk: 'UK',
  usa: 'USA',
  online: 'Online',
  cohort: 'Cohort',
  international: 'International Events',
  'international events': 'International Events',
  kazakhstan: 'Kazakhstan',
  egypt: 'Egypt',
  japan: 'Japan',
  germany: 'Germany',
  deutschland: 'Germany',
  armenia: 'Armenia',
  ahmedabad: 'Ahmedabad',
  alibag: 'Alibhag',
  alibhag: 'Alibhag',
  chennai: 'Chennai',
  jaipur: 'Jaipur',
  nalgonda: 'Nalgonda',
  'west bengal': 'West Bengal',
  kolkata: 'West Bengal',
  pune: 'Pune',
};

/**
 * Normalize event location to a canonical region for grouping.
 * Returns one of EVENTS_REGION_ORDER or "Other Cities" if no match.
 */
export function normalizeEventLocation(location: string): (typeof EVENTS_REGION_ORDER)[number] {
  if (!location || typeof location !== 'string') return 'Other Cities';
  const key = location.trim().toLowerCase();
  if (!key) return 'Other Cities';
  const canonical = LOCATION_TO_REGION[key];
  if (canonical) return canonical;
  // Exact match (case-insensitive) against EVENTS_REGION_ORDER
  const found = EVENTS_REGION_ORDER.find((r) => r.toLowerCase() === key);
  return found ?? 'Other Cities';
}
