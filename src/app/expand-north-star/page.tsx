import type { Metadata } from "next";
import { Cairo, Montserrat } from "next/font/google";
import { ExpandNorthStarPage } from "@/components/expand-north-star/ExpandNorthStarPage";
import { getPromotedCityOptions } from "@/lib/data-adapter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// The event's own typeface (expandnorthstar.com sets Cairo, headings at 800), scoped to this page
// through a CSS variable (--ens-font) so it never replaces the site font anywhere else.
const cairo = Cairo({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--ens-font",
  display: "swap",
});

// The delegation pieces use this, matching the delegation artwork and programme PDF: the green
// strip (800/900) and the day cards (400 body, 700 bold lead-ins). Without 400/700 the card text
// would fall back to the heavy faces and read as all bold.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--ens-strip-font",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Expand North Star 2026",
  description:
    "Expand North Star 2026, the startup and investor connector event hosted by Dubai Chamber Digital. Summit on 7 Dec 2026 at Dubai World Trade Centre, Expo on 8 to 10 Dec 2026 at Expo City Dubai.",
  alternates: { canonical: `${SITE_URL}/expand-north-star` },
  openGraph: {
    title: "Expand North Star 2026 – StartupNews.fyi",
    description:
      "The startup and investor connector event: Summit 7 Dec 2026 at Dubai World Trade Centre, Expo 8 to 10 Dec 2026 at Expo City Dubai.",
    url: `${SITE_URL}/expand-north-star`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

// Fetched here rather than in the client form, as /feature-your-startup, /list-your-event and the
// other submission pages do: the closing form's City dropdown is complete on first paint — no
// endpoint, no loading state, no flash of a list missing its earned cities.
//
// Partner logos are no longer fetched here (2026-09-19): the "Our partners" section now shows this
// page's own fixed referral-partner set (see EnsPartners.tsx / referralPartnerLogos.ts) instead of
// the admin Inner Pages feed /our-partners reads.
export default async function ExpandNorthStarRoute() {
  const promotedCities = await getPromotedCityOptions();
  return (
    <ExpandNorthStarPage
      fontClassName={`${cairo.variable} ${montserrat.variable}`}
      promotedCities={promotedCities}
    />
  );
}
