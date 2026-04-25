import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getEventBySlug, getEventImage } from "@/lib/data-adapter";
import { sanitizeContent, isValidContent } from "@/lib/content-utils";

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const dynamic = "force-dynamic";

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
  // Use excerpt if available, otherwise sanitize description (exclude CSS code)
  const sanitizedDesc = sanitizeContent(event.description);
  const description = (event.excerpt || sanitizedDesc || "").slice(0, 160);
  const image = getEventImage(event);
  const canonicalUrl = `${SITE_BASE}/startup-events/${slug}`;
  return {
    title,
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

  return (
    <div className="mvp-main-blog-wrap left relative mvp-main-blog-marg event-detail-page">
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
          <article className="event-detail-article">
            <header className="event-detail-header">
              <div className="event-detail-hero">
                <div
                  className="event-detail-hero-bg"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                  aria-hidden
                />
                <Image
                  src={imageUrl}
                  alt={event.title}
                  width={1200}
                  height={560}
                  className="event-detail-hero-img"
                  sizes="(max-width: 768px) 100vw, 1200px"
                  priority
                  style={{ objectFit: "contain" }}
                />
              </div>
              <h1 className="event-detail-title">{event.title}</h1>
              <div className="event-detail-meta">
                <span className="event-detail-date">{event.date}</span>
                {event.eventTime && (
                  <span className="event-detail-time">{event.eventTime}</span>
                )}
                <span className="event-detail-location">{event.location}</span>
              </div>
            </header>

            <div className="event-detail-body">
              {event.excerpt && (
                <p className="event-detail-excerpt">{event.excerpt}</p>
              )}
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
              <div className="event-detail-actions" style={{ flexDirection: 'column', justifyContent: 'center', marginTop: '20px', gap: '20px' }}>
                {event.url && (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="event-detail-book-btn">
                    Book Now
                  </a>
                )}
                <Link href="/events" className="event-detail-back">
                  Back to Events <i className="fa fa-long-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
