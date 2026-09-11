import type { Metadata } from "next";
import { PressReleasePage } from "@/components/press-release-submit/PressReleasePage";
import { getPromotedCityOptions } from "@/lib/data-adapter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Submit Your Press Release",
  description:
    "Submit your press release, funding announcement, or feature request to StartupNews.fyi for editorial review.",
  alternates: { canonical: `${SITE_URL}/submit-press-release` },
  openGraph: {
    title: "Submit Your Press Release – StartupNews.fyi",
    description:
      "Get your press release, funding announcement, or feature request in front of our editorial desk.",
    url: `${SITE_URL}/submit-press-release`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

// Fetched here rather than in the client form, for the same reason /list-your-event and the other
// two lead-form pages do it here: the City dropdown is complete on first paint — no endpoint, no
// loading state, no flash of a list missing its earned cities.
export default async function SubmitPressReleaseRoute() {
  const promotedCities = await getPromotedCityOptions();
  return <PressReleasePage promotedCities={promotedCities} />;
}
