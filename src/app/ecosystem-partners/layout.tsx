import type { Metadata } from "next";
import "../isolated-tailwind.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
	title: "Ecosystem Partners",
	description:
		"StartupNews.fyi's global ecosystem & media partners across the United States, UAE, UK, India and beyond.",
	alternates: { canonical: `${SITE_URL}/ecosystem-partners` },
	openGraph: {
		title: "Ecosystem Partners – StartupNews.fyi",
		description:
			"StartupNews.fyi's global ecosystem & media partners across the United States, UAE, UK, India and beyond.",
		url: `${SITE_URL}/ecosystem-partners`,
		siteName: "StartupNews.fyi",
		type: "website",
	},
};

export default function EcosystemPartnersLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
