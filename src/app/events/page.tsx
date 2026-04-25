import Link from "next/link";
import { getEventsByRegion, EVENTS_REGION_ORDER, getEventImage } from "@/lib/data-adapter";
import { EventByCountryCard } from "@/components/EventByCountryCard";

import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

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
            <h1 className="event-by-country-title">Events</h1>
            <p className="event-by-country-subtitle">Discover startup and technology events by region.</p>
          </header>
          <div className="mvp-main-blog-out left relative event-by-country-out">
            <div className="mvp-main-blog-in event-by-country-in">
              <div className="mvp-main-blog-body left relative event-by-country-body">
                {EVENTS_REGION_ORDER.map((region) => {
                  const events = eventsByRegion[region];
                  if (!events || events.length === 0) return null;

                  return (
                    <section key={region} className="event-by-country-section">
                      <h2 className="event-by-country-region">{`Events In ${region}`}</h2>
                      <ul className="event-by-country-list">
                        {events.map((event) => (
                          <EventByCountryCard
                            key={String(event.id ?? event.slug ?? event.url)}
                            event={event}
                            imageUrl={getEventImage(event)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
