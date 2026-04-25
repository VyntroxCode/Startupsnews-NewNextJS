import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Our Partners",
  description: "Our partners at StartupNews.fyi.",
  alternates: { canonical: `${SITE_URL}/our-partners` },
  openGraph: {
    title: "Our Partners – StartupNews.fyi",
    description: "Our partners at StartupNews.fyi.",
    url: `${SITE_URL}/our-partners`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

export default function OurPartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
