import Link from "next/link";
import { getEventsByRegion, getEventImage } from "@/lib/data-adapter";
import { EventByCountryCard } from "@/components/EventByCountryCard";
import type { StartupEvent } from "@/modules/events/domain/types";

import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// event_regions is a flat list mixing cities, countries, and a few non-geographic labels (e.g.
// "Online", "Cohort") with no country field of its own — this maps the city-level ones to the
// country they belong under for the page's "Events In {Country}" headings. A region NOT listed
// here (already a country name, e.g. "Australia", or unrecognized) falls back to using its own
// name as the country bucket, so it still renders sensibly as its own top-level section.
const REGION_COUNTRY: Record<string, string> = {
  Bengaluru: "India", "Delhi NCR": "India", Mumbai: "India", Hyderabad: "India",
  Chennai: "India", Ahmedabad: "India", Pune: "India", Jaipur: "India",
  Nalgonda: "India", "West Bengal": "India", Alibhag: "India",
  Dubai: "UAE", "Abu Dhabi": "UAE",
  Amsterdam: "Netherlands", Berlin: "Germany", Madrid: "Spain", Riyadh: "Saudi Arabia",
};
// Labels that aren't a place at all — shown as their own top-level section using their own
// name verbatim, not "Events In {name}", and never given a redundant city sub-heading.
const NON_GEOGRAPHIC_REGIONS = new Set(["Cohort", "Online", "Other Cities", "International Events"]);

/** Regroups the flat region -> events map into country -> city -> events, in the order
 * countries are first encountered (regions already come back alphabetically by region name). */
function groupByCountry(eventsByRegion: Record<string, StartupEvent[]>): Record<string, Record<string, StartupEvent[]>> {
  const grouped: Record<string, Record<string, StartupEvent[]>> = {};
  for (const [region, events] of Object.entries(eventsByRegion)) {
    if (!events || events.length === 0) continue;
    const country = REGION_COUNTRY[region] || region;
    if (!grouped[country]) grouped[country] = {};
    grouped[country][region] = events;
  }
  return grouped;
}

export const revalidate = 60;
// Prevent build-time DB access; render at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Startup Events by Region",
  description: "Discover upcoming startup and technology events across Dubai, Delhi NCR, Bengaluru, Hyderabad, Mumbai, and more.",
  alternates: { canonical: `${SITE_URL}/events` },
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
          <header className="event-by-country-header">
            <h2 className="event-by-country-title">Events</h2>
            <p className="event-by-country-subtitle">Discover startup and technology events by region.</p>
          </header>
          <div className="mvp-main-blog-out left relative event-by-country-out">
            <div className="mvp-main-blog-in event-by-country-in">
              <div className="mvp-main-blog-body left relative event-by-country-body">
                {Object.entries(eventsByCountry).map(([country, cities]) => (
                  <section key={country} className="event-by-country-section">
                    <h2 className="event-by-country-region">
                      {NON_GEOGRAPHIC_REGIONS.has(country) ? country : `Events In ${country}`}
                    </h2>
                    {Object.entries(cities).map(([city, events]) => (
                      <div key={city} className="event-by-country-city-group">
                        {city !== country && !NON_GEOGRAPHIC_REGIONS.has(city) && (
                          <h3 className="event-by-country-city">{city}</h3>
                        )}
                        <ul className="event-by-country-list">
                          {events.map((event) => (
                            <EventByCountryCard
                              key={String(event.id ?? event.slug ?? event.url)}
                              event={event}
                              imageUrl={getEventImage(event)}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
