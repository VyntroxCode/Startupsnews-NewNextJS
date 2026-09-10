import type { StartupEvent } from "../domain/types";
import { canonicalCountryName } from "@/modules/partnership-events/domain/country-city-data";

// event_regions is a flat list mixing cities, countries, and a few non-geographic labels (e.g.
// "Online", "Cohort") with no country field of its own — this maps the city-level ones to the
// country they belong under for country-name headings. A region NOT listed here (already a
// country name, e.g. "Australia", or unrecognized) falls back to using its own name as the
// country bucket, so it still renders sensibly as its own top-level section.
export const REGION_COUNTRY: Record<string, string> = {
  Bengaluru: "India", "Delhi NCR": "India", Mumbai: "India", Hyderabad: "India",
  Chennai: "India", Ahmedabad: "India", Pune: "India", Jaipur: "India",
  Nalgonda: "India", "West Bengal": "India", Alibhag: "India",
  Dubai: "UAE", "Abu Dhabi": "UAE",
  Amsterdam: "Netherlands", Berlin: "Germany", Madrid: "Spain", Riyadh: "Saudi Arabia",
};

// Labels that aren't a place at all — they keep their own sub-heading rather than being folded
// into a country's "Other Cities" bucket.
export const NON_GEOGRAPHIC_REGIONS = new Set(["Cohort", "Online", "International Events"]);

/**
 * The country a whole region belongs to, decided by MAJORITY of its events rather than by the
 * first one that happens to carry a country.
 *
 * A region is one city, so its events should all agree — but one mistyped row used to decide for
 * every event in that city. Real case: of the 8 upcoming Dubai events, 6 said UAE, 1 said India
 * and 1 was blank; the India one was earliest by date, and since the list arrives date-ascending
 * the old `events.find(e => e.country)` handed the whole Dubai carousel to India. A majority
 * cannot be flipped by a single bad row.
 *
 * Names are canonicalised before tallying, so "uae" and "UAE " count as the same country instead
 * of splitting the vote — and so the heading itself comes out in one consistent spelling.
 * Ties go to whichever country appears first, i.e. on the earliest event, matching the old rule.
 */
export function resolveCountry(region: string, events: StartupEvent[]): string {
  const tally = new Map<string, number>();
  for (const event of events) {
    const name = canonicalCountryName(event.country || "");
    if (name) tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [name, count] of tally) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  // No event in this region carries a country at all — fall back to the old city->country guess,
  // then to the region's own name, exactly as before.
  return best || REGION_COUNTRY[region] || region;
}
