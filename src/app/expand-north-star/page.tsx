import type { Metadata } from "next";
import localFont from "next/font/local";
import { ExpandNorthStarPage } from "@/components/expand-north-star/ExpandNorthStarPage";
import { getPromotedCityOptions } from "@/lib/data-adapter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// Link-preview thumbnail (WhatsApp, LinkedIn, X, …): the "Dubai is calling Indian founders"
// creative, re-encoded from the supplied 1672×941 PNG (2.7 MB) to a 1200×675 JPEG (~190 KB) so
// preview crawlers don't give up on the file size.
const OG_IMAGE = `${SITE_URL}/images/expand-north-star/og-indian-founders.jpg`;

// The event's own typeface (expandnorthstar.com sets Cairo, headings at 800), scoped to this page
// through a CSS variable (--ens-font) so it never replaces the site font anywhere else.
// Self-hosted (src/fonts, latin variable file) rather than next/font/google: see src/fonts/README.md.
const cairo = localFont({
  src: "../../fonts/cairo-latin-var.woff2",
  weight: "200 1000",
  variable: "--ens-font",
  display: "swap",
});

// The delegation pieces use this, matching the delegation artwork and programme PDF: the green
// strip (800/900) and the day cards (400 body, 700 bold lead-ins). Without 400/700 the card text
// would fall back to the heavy faces and read as all bold.
const montserrat = localFont({
  src: "../../fonts/montserrat-latin-var.woff2",
  weight: "100 900",
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
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 675,
        alt: "Dubai is calling Indian founders: Expand North Star, 7 to 12 December 2026, Dubai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expand North Star 2026 – StartupNews.fyi",
    description:
      "The startup and investor connector event: Summit 7 Dec 2026 at Dubai World Trade Centre, Expo 8 to 10 Dec 2026 at Expo City Dubai.",
    images: [OG_IMAGE],
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
