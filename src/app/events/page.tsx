import Link from "next/link";
import { getEventsByRegion } from "@/lib/data-adapter";
import { EventsCarousel } from "@/components/EventsCarousel";
import { EventsSearchBar } from "@/components/EventsSearchBar";
import type { StartupEvent } from "@/modules/events/domain/types";
import { OTHER_CITIES_SECTION, citySectionQualifies } from "@/modules/partnership-events/domain/country-city-data";
import { eventDateSortKey } from "@/modules/partnership-events/utils/public-event.utils";
import { NON_GEOGRAPHIC_REGIONS, resolveCountry } from "@/modules/events/utils/region-country.utils";
import { COHORT_PARTNERSHIP_TYPE } from "@/modules/partnership-events/domain/types";

import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

/** Regroups the flat region -> events map into country -> city -> events. Countries come out
 * India-first, then alphabetically — regions are keyed alphabetically by city/region name at
 * the source (event_regions ORDER BY name ASC), which otherwise puts whichever city happens to
 * sort first (e.g. "Abu Dhabi") ahead of India regardless of it being the primary market.
 * Events within each city are already ascending by date from the query that builds
 * eventsByRegion (events.repository's ORDER BY event_date ASC), so that part needs no sorting
 * here — only the country-level order needs fixing. */
function groupByCountry(eventsByRegion: Record<string, StartupEvent[]>): Record<string, Record<string, StartupEvent[]>> {
  const grouped: Record<string, Record<string, StartupEvent[]>> = {};
  for (const [region, events] of Object.entries(eventsByRegion)) {
    if (!events || events.length === 0) continue;
    // Prefer the events' own real `country` (set from the partnership tracker's Region/Country
    // field — see syncLinkedEvent) over guessing from the city name via REGION_COUNTRY, which
    // only recognizes a small hardcoded list of cities: any city not on that list (e.g.
    // "Mathura") used to silently become its own top-level section instead of nesting under
    // India. Falls back to the old guess only for events created before `country` existed.
    // "Cohort" is its own top-level heading: its events carry real countries (e.g. India), which
    // resolveCountry would otherwise use to file the whole section under that country.
    const isCohort = region === COHORT_PARTNERSHIP_TYPE;
    const country = isCohort ? region : resolveCountry(region, events);
    // A city earns its own carousel by having AUTO_SECTION_MIN_EVENTS listed events, and nothing
    // else (citySectionQualifies). Below that it shares one "Other Cities" carousel per country
    // rather than rendering a heading over a one- or two-card row, which is the whole point of
    // that bucket; each card still names its own city, so nothing is lost by merging them.
    // `events.length` is the right count with no extra work — getEventsByRegion has already
    // collected every listed event for this city into this one bucket. The rule is symmetric: a
    // city that drops back below the threshold as its events pass returns to Other Cities, so the
    // page always reflects what is actually listed.
    //
    // Curation (COUNTRY_CITY_DATA) used to grant an exemption here and no longer does — that is
    // what kept single-event sections like Kochi, Boston and Abu Dhabi on the page.
    //
    // Two things that are NOT cities keep their own section either way: a region that IS the
    // country ("Kuwait" with no city set — there is no city name to merge, and its card would
    // read as the country anyway) and a non-place label ("Online").
    // An admin override on ANY event of this city decides for the whole city — the setting is
    // city-wide by design (see CITY_SECTION_OVERRIDE_OPTIONS), which is what stops a city being
    // split across two sections when only some of its events carry the value. 'other' beats 'own'
    // if both somehow appear: keeping a city merged is the quieter, easily-reversed outcome.
    const overrides = new Set(events.map((e) => e.citySectionOverride).filter(Boolean));
    const forcedOther = overrides.has('other');
    const forcedOwn = !forcedOther && overrides.has('own');
    // Cohort ignores the city-section overrides — it is always one carousel under its heading.
    const section = isCohort ? region :
      !forcedOther &&
      (forcedOwn ||
        region === country ||
        NON_GEOGRAPHIC_REGIONS.has(region) ||
        citySectionQualifies(events.length))
        ? region
        : OTHER_CITIES_SECTION;
    if (!grouped[country]) grouped[country] = {};
    // Merge rather than assign — several regions now collapse onto the same section key.
    grouped[country][section] = [...(grouped[country][section] || []), ...events];
  }
  for (const country of Object.keys(grouped)) {
    const others = grouped[country][OTHER_CITIES_SECTION];
    if (!others) continue;
    // Each source region arrived date-ascending, but concatenating several of them interleaves
    // them wrongly — this is the one section built from more than one region, so it's the one
    // that has to be re-sorted. Every other section keeps the order the query gave it.
    others.sort((a, b) => eventDateSortKey(a) - eventDateSortKey(b));
    // And "Other Cities" is the catch-all, so it reads last under its country regardless of
    // where its constituent regions happened to sort.
    const sections = Object.entries(grouped[country]);
    if (sections.length > 1) {
      grouped[country] = Object.fromEntries([
        ...sections.filter(([name]) => name !== OTHER_CITIES_SECTION),
        [OTHER_CITIES_SECTION, others],
      ]);
    }
  }
  const orderedEntries = Object.entries(grouped).sort(([a], [b]) => {
    if (a === "India") return -1;
    if (b === "India") return 1;
    return a.localeCompare(b);
  });
  return Object.fromEntries(orderedEntries);
}

export const revalidate = 60;
// Prevent build-time DB access; render at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Startup Events by Region",
  description: "Discover upcoming startup and technology events across Dubai, Delhi NCR, Bengaluru, Hyderabad, Mumbai, and more.",
  alternates: { canonical: `${SITE_URL}/events` },
  // Always indexable, even when the site-wide ROBOTS_NOINDEX env gate (root layout) is on.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: "Startup Events by Region – StartupNews.fyi",
    description: "Discover upcoming startup and technology events across global regions.",
    url: `${SITE_URL}/events`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};


export default async function EventsPage() {
  const eventsByRegion = await getEventsByRegion();
  const eventsByCountry = groupByCountry(eventsByRegion);
  // Deduped by slug (falling back to id) — a handful of legacy/duplicate rows can otherwise
  // appear twice in the flat region map, which would show the same card twice in search results.
  const allEvents = Array.from(
    new Map(
      Object.values(eventsByRegion).flat().map((event) => [event.slug || event.id || event.url, event])
    ).values()
  );

  return (
    <div className="mvp-main-blog-wrap left relative mvp-main-blog-marg event-by-country-page">
      <div className="mvp-main-box event-by-country-container">
        <div className="mvp-main-blog-cont left relative">
          <nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="event-by-country-breadcrumb-link">
              Home
            </Link>
            <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="event-by-country-breadcrumb-current" aria-current="page">
              Events
            </span>
          </nav>
          <div className="mvp-main-blog-out left relative event-by-country-out">
            <div className="mvp-main-blog-in event-by-country-in">
              <div className="mvp-main-blog-body left relative event-by-country-body">
                <EventsSearchBar
                  allEvents={allEvents}
                  title="Events"
                  subtitle="Discover startup and technology events by region."
                >
                  {Object.entries(eventsByCountry).map(([country, cities]) => (
                    <section key={country} className="event-by-country-section">
                      <h2 className="event-by-country-region">{country}</h2>
                      {Object.entries(cities).map(([city, events]) => (
                        <div key={city} className="event-by-country-city-group">
                          <EventsCarousel
                            events={events}
                            maxEvents={events.length}
                            title={city !== country && !NON_GEOGRAPHIC_REGIONS.has(city) ? city : null}
                            className="event-country-carousel"
                          />
                        </div>
                      ))}
                    </section>
                  ))}
                </EventsSearchBar>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
