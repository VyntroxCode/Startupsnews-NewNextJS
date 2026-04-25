import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Search",
    description: "Search for startup news, articles, and stories on StartupNews.fyi.",
    alternates: { canonical: `${SITE_URL}/search` },
    robots: { index: true, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
