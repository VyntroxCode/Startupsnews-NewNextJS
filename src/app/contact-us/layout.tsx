import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
    title: "Contact Us",
    description: "Get in touch with StartupNews.fyi for press inquiries, subscriptions, technical support, and career opportunities.",
    alternates: { canonical: `${SITE_URL}/contact-us` },
    openGraph: {
        title: "Contact Us – StartupNews.fyi",
        description: "Get in touch with StartupNews.fyi for press inquiries, subscriptions, and support.",
        url: `${SITE_URL}/contact-us`,
        siteName: "StartupNews.fyi",
        type: "website",
    },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
