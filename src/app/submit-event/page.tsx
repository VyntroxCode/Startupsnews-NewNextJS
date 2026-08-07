import type { Metadata } from "next";
import { SubmitEventForm } from "@/components/submit-event/SubmitEventForm";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Submit Your Event",
  description:
    "Hosting a meetup, founder session, workshop, hackathon, or startup event? Submit your event details to StartupNews.fyi and reach founders, entrepreneurs, investors, and the wider startup community.",
  alternates: { canonical: `${SITE_URL}/submit-event` },
  openGraph: {
    title: "Submit Your Event – StartupNews.fyi",
    description:
      "Share your startup event details and get featured on StartupNews.fyi's Events page.",
    url: `${SITE_URL}/submit-event`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

export default function SubmitEventPage() {
  return (
    <div className="snf-page" id="snf-root">
      <div className="ribbon-row">
        <div className="ribbon">Submit Your Event</div>
        <div className="rule"></div>
      </div>
      <h1 className="page-heading">🎤 Your Event Deserves the Spotlight</h1>
      <p className="page-lede">
        Hosting a meetup, founder session, workshop, hackathon, or startup event? Share the details below and let
        StartupNews.fyi help you reach founders, entrepreneurs, investors, and the wider startup community. Approved
        events will be featured on StartupNews.fyi.
      </p>
      <SubmitEventForm />
    </div>
  );
}
