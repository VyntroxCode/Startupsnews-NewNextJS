import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";
import { getInnerPageContent } from "@/lib/data-adapter";

export const revalidate = 60;
export const dynamic = "force-dynamic";

// Shown only if an admin hasn't set any Page Content yet from Inner Pages → Contact Us, so the
// page never renders visibly empty. See src/app/our-partners/page.tsx for the same pattern.
const DEFAULT_CONTENT = (
  <div className="contact-us-sections">
    <div className="contact-us-section-item">
      <h2 className="contact-us-section-item-title">Quick Support</h2>
      <p className="contact-us-section-item-body">
        Please chat with our team using the chat widget at the bottom right hand corner of this page, which typically offers the fastest support.
      </p>
      <p className="contact-us-section-item-body">
        Or you can also share your concern at{" "}
        <a href="mailto:office@startupnews.fyi">
          office@startupnews.fyi
        </a>
      </p>
    </div>

    <div className="contact-us-section-item">
      <h2 className="contact-us-section-item-title">Press</h2>
      <p className="contact-us-section-item-body">
        For all press inquiries or press releases, please email at{" "}
        <a href="mailto:publishing@startupnews.fyi">
          publishing@startupnews.fyi
        </a>
      </p>
    </div>

    <div className="contact-us-section-item">
      <h2 className="contact-us-section-item-title">Careers</h2>
      <p className="contact-us-section-item-body">
        For information regarding careers with us, please email at{" "}
        <a className="contact-us-section-item-link" href="mailto:office@startupnews.fyi">
          office@startupnews.fyi
        </a>
      </p>
    </div>

    <div className="contact-us-section-item">
      <h2 className="contact-us-section-item-title">Website Support</h2>
    </div>
  </div>
);

export default async function ContactUsPage() {
  const contentHtml = await getInnerPageContent("contact-us");

  return (
    <div
      id="mvp-article-cont"
      className="left relative contact-us-custom-page">
      <div className="px-6 pt-2">
        <PageBreadcrumb current="Contact Us" />
      </div>
      <PageHeading title="Contact Us" />

      <div className="kt-row-column-wrap">
        <section className="contact-us-section">
          {contentHtml ? (
            <div className="contact-us-sections" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          ) : (
            DEFAULT_CONTENT
          )}
        </section>
      </div>
    </div>
  );
}
