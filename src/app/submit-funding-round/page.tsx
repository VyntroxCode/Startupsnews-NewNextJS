import type { Metadata } from "next";
import { FundingRoundPage } from "@/components/funding-round-submit/FundingRoundPage";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Submit Your Funding Round",
  description:
    "Submit your startup's funding round details to StartupNews.fyi for editorial review and coverage consideration.",
  alternates: { canonical: `${SITE_URL}/submit-funding-round` },
  openGraph: {
    title: "Submit Your Funding Round – StartupNews.fyi",
    description:
      "Share your funding round with StartupNews.fyi and get considered for coverage across our global startup network.",
    url: `${SITE_URL}/submit-funding-round`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

export default function SubmitFundingRoundRoute() {
  return <FundingRoundPage />;
}
