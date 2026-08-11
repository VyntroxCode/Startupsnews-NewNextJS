import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventsByRegion, getEventImage } from "@/lib/data-adapter";
import { EventByCountryCard } from "@/components/EventByCountryCard";
import { ArrowRightIcon } from "@/components/icons";

// Helper to convert region name to slug (e.g. "Delhi NCR" -> "delhi-ncr")
function slugify(text: string) {
    return text.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
}

// Helper to find region from slug against live region keys
function getRegionFromSlug(slug: string, regionKeys: string[]) {
    return regionKeys.find((r) => slugify(r) === slug);
}

// Make pages dynamic to avoid connection pool exhaustion during build
// Pages will be generated on-demand (first request) and cached with ISR
export const dynamicParams = true; // Allow dynamic generation

// Enable ISR - regenerate pages every hour
export const revalidate = 3600; // 1 hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const eventsByRegion = await getEventsByRegion();
    const region = getRegionFromSlug(slug, Object.keys(eventsByRegion));

    if (!region) {
        return { title: "Event Not Found" };
    }

    return {
        title: `${region} Startup Events`,
        description: `Discover upcoming startup and technology events in ${region}. Stay updated with StartupNews.fyi.`,
        alternates: { canonical: `${SITE_URL}/events/${slug}` },
        openGraph: {
            title: `${region} Startup Events – StartupNews.fyi`,
            description: `Startup and technology events in ${region}.`,
            url: `${SITE_URL}/events/${slug}`,
            siteName: "StartupNews.fyi",
            type: "website",
        },
    };
}


export default async function RegionEventsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const eventsByRegion = await getEventsByRegion();
    const region = getRegionFromSlug(slug, Object.keys(eventsByRegion));

    if (!region) {
        notFound();
    }

    const upcomingEvents = eventsByRegion[region] || [];

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
                        <Link href="/events" className="event-by-country-breadcrumb-link">
                            Events
                        </Link>
                        <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
                            /
                        </span>
                        <span className="event-by-country-breadcrumb-current" aria-current="page">
                            {region}
                        </span>
                    </nav>
                    <div className="mvp-main-blog-out left relative event-by-country-out">
                        <div className="mvp-main-blog-in event-by-country-in">
                            <div className="mvp-main-blog-body left relative event-by-country-body">
                                <section className="event-by-country-section" style={{ paddingTop: "20px" }}>
                                    <h2 className="event-by-country-region">Events In {region}</h2>
                                    {upcomingEvents.length > 0 ? (
                                        <ul className="event-by-country-list">
                                            {upcomingEvents.map((event) => (
                                                <EventByCountryCard
                                                    key={String(event.id ?? event.slug ?? event.url)}
                                                    event={event}
                                                    imageUrl={getEventImage(event)}
                                                />
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>No upcoming events found for {region} at this time.</p>
                                    )}
                                    <div style={{ marginTop: "40px", textAlign: "center" }}>
                                        <Link href="/events" className="event-detail-back">
                                            Back to Events <ArrowRightIcon aria-hidden="true" style={{ marginLeft: "5px" }} />
                                        </Link>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
