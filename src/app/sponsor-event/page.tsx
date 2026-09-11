import type { Metadata } from "next";
import { SponsorEventPage } from "@/components/sponsor-event/SponsorEventPage";
import { getPromotedCityOptions } from "@/lib/data-adapter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Partner / Sponsor an Event",
  description:
    "Partner with or sponsor an event on StartupNews.fyi. Submit your event details for editorial review and get featured in front of founders, investors, and the startup community.",
  alternates: { canonical: `${SITE_URL}/sponsor-event` },
  openGraph: {
    title: "Partner / Sponsor an Event – StartupNews.fyi",
    description:
      "Submit your event details to partner with or sponsor coverage on StartupNews.fyi.",
    url: `${SITE_URL}/sponsor-event`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

// Fetched here rather than in the client form, as /list-your-event and the other submission pages
// do: the City dropdown is complete on first paint — no endpoint, no loading state, no flash of a
// list missing its earned cities.
export default async function SponsorEventRoute() {
  const promotedCities = await getPromotedCityOptions();
  return <SponsorEventPage promotedCities={promotedCities} />;
}
