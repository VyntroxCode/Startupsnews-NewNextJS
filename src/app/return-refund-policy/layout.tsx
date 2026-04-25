import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Cancellation / Refund Policy",
    description: "Read StartupNews.fyi's return and refund policy, including cancellation rights, conditions for returns, and contact information.",
    alternates: { canonical: `${SITE_URL}/return-refund-policy` },
    openGraph: {
        title: "Return & Refund Policy – StartupNews.fyi",
        description: "StartupNews.fyi return and refund policy.",
        url: `${SITE_URL}/return-refund-policy`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function RefundLayout({ children }: { children: React.ReactNode }) {
    return children;
}
