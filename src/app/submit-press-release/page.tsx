import type { Metadata } from "next";
import { PressReleasePage } from "@/components/press-release-submit/PressReleasePage";

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

export default function SubmitPressReleaseRoute() {
  return <PressReleasePage />;
}
