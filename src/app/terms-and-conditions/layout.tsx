import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Terms and Conditions",
    description: "Review the terms and conditions for using StartupNews.fyi, including licensing, linking policies, and content liability.",
    alternates: { canonical: `${SITE_URL}/terms-and-conditions` },
    openGraph: {
        title: "Terms and Conditions – StartupNews.fyi",
        description: "Terms and conditions for using StartupNews.fyi.",
        url: `${SITE_URL}/terms-and-conditions`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
