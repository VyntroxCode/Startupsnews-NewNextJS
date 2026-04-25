import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn about StartupNews.fyi — your trusted source for startup news, funding rounds, and tech innovation across AI, fintech, healthtech, and more.",
    alternates: { canonical: `${SITE_URL}/about` },
    openGraph: {
        title: "About Us – StartupNews.fyi",
        description: "Learn about StartupNews.fyi — your trusted source for startup news, funding rounds, and tech innovation.",
        url: `${SITE_URL}/about`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
