import { notFound } from "next/navigation";
import { getEventsByRegion, getEventImage, EVENTS_REGION_ORDER } from "@/lib/data-adapter";
import { EventByCountryCard } from "@/components/EventByCountryCard";

// Helper to convert region name to slug (e.g. "Delhi NCR" -> "delhi-ncr")
function slugify(text: string) {
    return text.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
}

// Helper to find region from slug
function getRegionFromSlug(slug: string) {
    return EVENTS_REGION_ORDER.find((r) => slugify(r) === slug);
}

// Make pages dynamic to avoid connection pool exhaustion during build
// Pages will be generated on-demand (first request) and cached with ISR
export const dynamicParams = true; // Allow dynamic generation

// Enable ISR - regenerate pages every hour
export const revalidate = 3600; // 1 hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const region = getRegionFromSlug(slug);

    if (!region) {
        return {
            title: "Event Not Found",
        };
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
    const region = getRegionFromSlug(slug);

    if (!region) {
        notFound();
    }

    const eventsByRegion = await getEventsByRegion();
    const upcomingEvents = eventsByRegion[region] || [];

    return (
        <div className="mvp-main-blog-wrap left relative mvp-main-blog-marg event-by-country-page">
            <div className="mvp-main-box">
                <div className="mvp-main-blog-cont left relative">
                    <div className="mvp-main-blog-out left relative event-by-country-out">
                        <div className="mvp-main-blog-in event-by-country-in">
                            <div className="mvp-main-blog-body left relative event-by-country-body">
                                <section className="event-by-country-section" style={{ paddingTop: "40px" }}>
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
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
