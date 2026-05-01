import type { Metadata, Viewport } from "next";
// Single global stylesheet – no Tailwind; all theme styles in globals.css
import "./globals.css";
import { FlyMenu } from "@/components/FlyMenu";
import { FlyMenuProvider } from "@/components/FlyMenuContext";
import { FlyMenuFade } from "@/components/FlyMenuFade";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeScript } from "@/components/ThemeScript";
import { TopLoader } from "@/components/TopLoader";
import { siteConfig } from "@/lib/config";
import ConditionalLayout from "@/components/ConditionalLayout";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Startup News | News from Startups India and across the globe",
    template: "%s | StartupNews.fyi",
  },
  description:
    "StartupNews.fyi delivers the latest startup news, funding rounds, technology innovation, and industry analysis across AI, fintech, ecommerce, healthtech, and more.",
  keywords: [
    "startup news",
    "startup funding",
    "tech news",
    "AI news",
    "fintech",
    "ecommerce",
    "healthtech",
    "startup events",
    "venture capital",
    "innovation",
  ],
  authors: [{ }], // Aditya
  creator: "StartupNews.fyi",
  publisher: "StartupNews.fyi",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "StartupNews.fyi",
    title: "Startup News | News from Startups India and across the globe",
    description:
      "Your trusted source for startup news, funding rounds, and tech innovation across AI, fintech, ecommerce, healthtech, and more.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "StartupNews.fyi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup News | News from Startups India and across the globe",
    description:
      "Your trusted source for startup news, funding rounds, and tech innovation.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: "#ffffff",
};

/* ── JSON-LD: Organization + WebSite (global, rendered once) ── */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "StartupNews.fyi",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [
    siteConfig.social.facebook,
    siteConfig.social.twitter,
    siteConfig.social.instagram,
    siteConfig.social.youtube,
    siteConfig.social.linkedin,
  ].filter(Boolean),
  contactPoint: {
    "@type": "ContactPoint",
    email: "office@startupnews.fyi",
    contactType: "customer service",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "StartupNews.fyi",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <TopLoader />
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <ThemeScript />
      </body>
    </html>
  );
}
