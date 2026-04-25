import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Advertise With Us",
    description: "Reach a global audience of startup founders, investors, and tech leaders. Explore advertising opportunities with StartupNews.fyi.",
    alternates: { canonical: `${SITE_URL}/advertise-with-us` },
    openGraph: {
        title: "Advertise With Us – StartupNews.fyi",
        description: "Reach a global audience of startup founders, investors, and tech leaders.",
        url: `${SITE_URL}/advertise-with-us`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function AdvertiseLayout({ children }: { children: React.ReactNode }) {
    return children;
}
