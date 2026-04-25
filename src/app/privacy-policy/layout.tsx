import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Read the StartupNews.fyi privacy policy to understand how we collect, use, and protect your personal information.",
    alternates: { canonical: `${SITE_URL}/privacy-policy` },
    openGraph: {
        title: "Privacy Policy – StartupNews.fyi",
        description: "StartupNews.fyi privacy policy — how we collect, use, and protect your data.",
        url: `${SITE_URL}/privacy-policy`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
