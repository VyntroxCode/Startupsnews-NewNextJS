import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getEventBySlug, getEventImage, getEventsByRegion } from "@/lib/data-adapter";
import { sanitizeContent, isValidContent } from "@/lib/content-utils";
import { Building2, Calendar, Clock, ExternalLink, MapPin, Ticket } from "lucide-react";
import { ArrowRightIcon } from "@/components/icons";
import { seoTitle } from "@/lib/seo-title";
import { buildEventJsonLd, serializeJsonLd } from "@/modules/events/utils/event-json-ld";
import { pickSimilarEvents } from "@/modules/events/utils/similar-events.utils";
import { EventsCarousel } from "@/components/EventsCarousel";

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const revalidate = 300;
export const dynamicParams = true;

// Nothing is prerendered at build (keeps the DB out of the build), but declaring this is what
// makes Next cache each URL on first request and honour `revalidate` — without it a dynamic
// segment renders from the DB on every request and `revalidate` is ignored.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event)
    return { title: "Event not found | StartupNews.fyi" };
  const title = `${event.title} | Startup Events`;
  // Use excerpt if available, otherwise strip HTML from description for a plain-text meta description
  const sanitizedDesc = sanitizeContent(event.description);
  const plainDesc = sanitizedDesc?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const description = (event.excerpt || plainDesc || "").slice(0, 160);
  const image = getEventImage(event);
  const canonicalUrl = `${SITE_BASE}/startup-events/${slug}`;
  return {
    title: seoTitle(event.title, "Startup Events"),
    description: description || undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description: description || undefined,
      url: canonicalUrl,
      siteName: "StartupNews.fyi",
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: event.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || undefined,
      ...(image && { images: [image] }),
    },
  };
}

export default async function StartupEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const imageUrl = getEventImage(event);
  // Same city → same country → anything else, soonest first, never this event (see
  // pickSimilarEvents). getEventsByRegion is the cached upcoming-only map /events already uses.
  const similarEvents = pickSimilarEvents(event, await getEventsByRegion());
  const eventJsonLd = buildEventJsonLd({ ...event, image: imageUrl }, `${SITE_BASE}/startup-events/${slug}`);

  return (
    <div className="mvp-main-blog-wrap left relative mvp-main-blog-marg event-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd) }}
      />
      <div className="mvp-main-box event-detail-container">
        <div className="mvp-main-blog-cont left relative">
          <nav className="event-detail-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="event-detail-breadcrumb-link">
              Home
            </Link>
            <span className="event-detail-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <Link href="/events" className="event-detail-breadcrumb-link">
              Events
            </Link>
            <span className="event-detail-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="event-detail-breadcrumb-current" aria-current="page">
              {event.title}
            </span>
          </nav>
          {/* Two columns from lg up: banner + About on the left, a sticky details box on the right
              (title, date, time, venue, organiser, price, button). Below lg it stacks banner →
              details box → About, so the key facts still come right after the banner. */}
          <article className="event-detail-article grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="event-detail-hero min-w-0 mb-0!">
              <Image
                src={imageUrl}
                alt={event.title}
                width={1200}
                height={630}
                className="event-detail-hero-img"
                sizes="(max-width: 1024px) 100vw, 800px"
                priority
                style={{ objectFit: "contain" }}
              />
            </div>

            <aside className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {/* box-border throughout: this page has no Tailwind Preflight, so without it padding is
                  added on top of w-full and the button spills out of the card. */}
              <div className="box-border w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                <div className="box-border border-b border-neutral-100 px-6 pt-6 pb-5">
                  <h1 className="m-0 text-xl font-bold leading-snug text-neutral-900">{event.title}</h1>
                </div>
                <dl className="m-0 box-border flex flex-col gap-5 px-6 py-5">
                  {event.dateRange && (
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E62E69]/10 text-[#E62E69]">
                        <Calendar className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</dt>
                        <dd className="m-0 text-[15px] font-medium leading-snug text-neutral-900">{event.dateRange}</dd>
                      </div>
                    </div>
                  )}
                  {/* Pre-built in the mapper (buildTimeRange) — already 12-hour and empty when the
                      organiser gave no time, so "is there a label" is the whole test. */}
                  {event.timeRange && (
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E62E69]/10 text-[#E62E69]">
                        <Clock className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Time</dt>
                        <dd className="m-0 text-[15px] font-medium leading-snug text-neutral-900">{event.timeRange}</dd>
                      </div>
                    </div>
                  )}
                  {(event.venueAddress || event.location) && (
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E62E69]/10 text-[#E62E69]">
                        <MapPin className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Venue</dt>
                        <dd className="m-0 text-[15px] font-medium leading-snug text-neutral-900">
                          {event.venueAddress || event.location}
                          {event.googleLocationLink && (
                            <a
                              href={event.googleLocationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 flex w-fit items-center gap-1 text-sm font-semibold text-[#E62E69] no-underline hover:underline"
                            >
                              View on map <ExternalLink className="size-3.5" aria-hidden="true" />
                            </a>
                          )}
                        </dd>
                      </div>
                    </div>
                  )}
                  {event.organiser && (
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E62E69]/10 text-[#E62E69]">
                        <Building2 className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Organiser</dt>
                        <dd className="m-0 text-[15px] font-medium leading-snug text-neutral-900">{event.organiser}</dd>
                      </div>
                    </div>
                  )}
                  {event.ticketPrice && (
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E62E69]/10 text-[#E62E69]">
                        <Ticket className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Ticket</dt>
                        <dd className="m-0 text-[15px] font-medium leading-snug text-neutral-900">
                          {[event.ticketCurrency, event.ticketPrice].filter(Boolean).join(" ")}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
                {event.url && (
                  <div className="box-border px-6 pb-6">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="box-border block w-full rounded-lg bg-[#E62E69] px-6 py-3.5 text-center text-base font-bold text-white! no-underline transition hover:bg-[#c41a52] hover:shadow-[0_8px_20px_rgba(230,46,105,0.35)]"
                    >
                      Get Access Now
                    </a>
                  </div>
                )}
              </div>
            </aside>

            <div className="min-w-0 lg:col-start-1">
              <h2 className="m-0 mb-5 inline-block border-b-[3px] border-neutral-900 pb-1 text-2xl font-bold text-neutral-900">
                About
              </h2>
              {/* Excerpt intentionally not rendered — it is a truncated copy of the
                  description below and duplicated the text on the page. It is still
                  used for the meta/OG description in generateMetadata(). */}
              {(() => {
                const sanitizedDescription = sanitizeContent(event.description);
                if (sanitizedDescription) {
                  // Check if it contains HTML tags
                  const hasHTML = /<[^>]+>/.test(sanitizedDescription);
                  if (hasHTML && isValidContent(sanitizedDescription)) {
                    // Render as HTML if it's valid HTML content
                    return (
                      <div
                        className="event-detail-description"
                        dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                      />
                    );
                  } else if (isValidContent(sanitizedDescription)) {
                    // Render as plain text if it's valid text content
                    return (
                      <div className="event-detail-description">
                        <p>{sanitizedDescription}</p>
                      </div>
                    );
                  }
                }
                // If description is invalid (CSS code, etc.), don't render it
                return null;
              })()}

              {event.speakers && event.speakers.length > 0 && (
                <div className="event-detail-speakers">
                  <h3 className="event-detail-section-title">Key Speakers / Guests</h3>
                  <div className="event-detail-speakers-row">
                    {event.speakers.map((sp, i) => (
                      <div className="event-detail-speaker-card" key={`${sp.name}-${i}`}>
                        <div className="event-detail-speaker-name">{sp.name}</div>
                        {sp.designation && <div className="event-detail-speaker-designation">{sp.designation}</div>}
                        {sp.company && <div className="event-detail-speaker-company">{sp.company}</div>}
                        {sp.others && <div className="event-detail-speaker-others">{sp.others}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="event-detail-actions" style={{ marginTop: '20px' }}>
                <Link href="/events" className="event-detail-back">
                  More Events <ArrowRightIcon aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
          {/* Same cards as the /events carousels; 3 fit in a row on desktop, so it never autoplays there. */}
          {similarEvents.length > 0 && (
            <section className="pb-14" aria-label="Similar Events">
              <EventsCarousel events={similarEvents} maxEvents={similarEvents.length} title="Similar Events" />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
