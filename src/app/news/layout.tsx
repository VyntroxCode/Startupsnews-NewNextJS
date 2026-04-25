import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Latest News",
    description: "Read the latest startup news, funding rounds, and technology updates on StartupNews.fyi.",
    alternates: { canonical: `${SITE_URL}/news` },
    openGraph: {
        title: "Latest News – StartupNews.fyi",
        description: "Read the latest startup news, funding rounds, and technology updates.",
        url: `${SITE_URL}/news`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
