import type { Metadata } from "next";
import { FeatureStartupPage } from "@/components/feature-startup/FeatureStartupPage";
import { getPromotedCityOptions } from "@/lib/data-adapter";
import { getFeatureStartupImages } from "@/lib/site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Feature Your Startup",
  description:
    "Share your startup's story with StartupNews.fyi. Tell us about your company, team, and what you're building — get considered for coverage across our global startup network.",
  alternates: { canonical: `${SITE_URL}/feature-your-startup` },
  openGraph: {
    title: "Feature Your Startup – StartupNews.fyi",
    description:
      "Get your startup in front of founders, investors, and operators. Share your details with StartupNews.fyi.",
    url: `${SITE_URL}/feature-your-startup`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

// Fetched here rather than in the client form, for the same reason /list-your-event does it here:
// the City dropdown is then complete on first paint — no endpoint, no loading state, and no flash
// of a list missing the cities that have earned a slot. Same for the admin hero-image override:
// the chosen photo is in the HTML instead of replacing the bundled one after hydration.
export default async function FeatureYourStartupRoute() {
  const [promotedCities, heroImages] = await Promise.all([getPromotedCityOptions(), getFeatureStartupImages()]);
  return <FeatureStartupPage promotedCities={promotedCities} heroImageSrc={heroImages.step1} />;
}
