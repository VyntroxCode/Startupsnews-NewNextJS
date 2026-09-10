import Link from "next/link";

/** Sidebar CTA pointing readers to the public event submission wizard at /list-your-event. */
export function SubmitEventPromo() {
  return (
    <section className="mvp-side-widget">
      <div className="se-promo">
        <p className="se-promo-eyebrow">Hosting an event?</p>
        <h3 className="se-promo-title">Get your startup event featured</h3>
        <p className="se-promo-body">
          List your meetup, workshop, or hackathon details and reach founders, investors, and the wider startup
          community on StartupNews.fyi.
        </p>
        <Link href="/list-your-event" className="se-promo-cta">
          List Your Event
        </Link>
      </div>
    </section>
  );
}
