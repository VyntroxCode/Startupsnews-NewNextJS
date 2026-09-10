import type { Metadata } from "next";
import "../isolated-tailwind.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the team building StartupNews.fyi — the go-to source for startup and technology news. See our culture, perks, and how to apply.",
  alternates: { canonical: `${SITE_URL}/careers` },
  openGraph: {
    title: "Careers – StartupNews.fyi",
    description: "Join the team building StartupNews.fyi. See our culture, perks, and how to apply.",
    url: `${SITE_URL}/careers`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
