import type { Metadata } from "next";
import { FeatureStartupPage } from "@/components/feature-startup/FeatureStartupPage";

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

export default function FeatureYourStartupRoute() {
  return <FeatureStartupPage />;
}
