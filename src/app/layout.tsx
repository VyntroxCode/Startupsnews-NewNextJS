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
import AuthModal from "@/components/AuthModal";
import Script from "next/script";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "StartupNews.fyi | News from Startups India and across the globe",
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
  robots: process.env.ROBOTS_NOINDEX === "true"
    ? { index: false, follow: false, googleBot: { index: false, follow: false } }
    : { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "StartupNews.fyi",
    title: "StartupNews.fyi | News from Startups India and across the globe",
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
  verification: {
    other: {
      "msvalidate.01": ["7AA71D3ABAB34C6C1C8E9654A46C1EE7"],
    },
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

/* ── JSON-LD: @graph (Organization + Persons + WebSite + WebPage + Breadcrumb) ── */
const graphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "NewsMediaOrganization"],
      "@id": "https://www.startupnews.fyi/#organization",
      name: "StartupNews.fyi",
      alternateName: ["StartupNews", "SNFYI"],
      url: "https://www.startupnews.fyi/",
      logo: {
        "@type": "ImageObject",
        "@id": "https://www.startupnews.fyi/#logo",
        url: "https://www.startupnews.fyi/wp-content/uploads/2024/01/logo.png",
        contentUrl: "https://www.startupnews.fyi/wp-content/uploads/2024/01/logo.png",
        caption: "StartupNews.fyi",
        inLanguage: "en",
        width: 512,
        height: 512,
      },
      image: { "@id": "https://www.startupnews.fyi/#logo" },
      description:
        "StartupNews.fyi is one of India's leading startup media and news platforms covering startup news, funding updates, founder stories, venture capital, technology, entrepreneurship, startup ecosystem trends, and global innovation.",
      email: "office@startupnews.fyi",
      foundingDate: "2019",
      founders: [
        { "@id": "https://www.startupnews.fyi/#kapil-suri" },
        { "@id": "https://www.startupnews.fyi/#madhur-mohan-malik" },
      ],
      knowsAbout: [
        "Startup News", "Indian Startups", "Startup Funding", "Venture Capital",
        "Entrepreneurship", "Technology", "Business News", "Startup Ecosystem",
        "Founder Stories", "Artificial Intelligence", "SaaS", "Fintech",
        "Web3", "Ecommerce", "D2C Brands", "Tech Innovation",
      ],
      sameAs: [
        "https://www.linkedin.com/company/startupnewsfyi",
        "https://www.instagram.com/startupnews.fyi/",
        "https://www.facebook.com/startupnews.fyi/",
        "https://play.google.com/store/apps/details?id=com.startupnews.fyi",
        "https://apps.apple.com/in/app/startupnews-fyi/id6473291055",
      ],
      publishingPrinciples: "https://www.startupnews.fyi/editorial-policy",
      masthead: "https://www.startupnews.fyi/about-us",
      ownershipFundingInfo: "https://www.startupnews.fyi/about-us",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "office@startupnews.fyi",
          availableLanguage: ["English"],
        },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "New Delhi",
        addressRegion: "Delhi",
        addressCountry: "India",
      },
      areaServed: { "@type": "Country", name: "India" },
    },
    {
      "@type": "Person",
      "@id": "https://www.startupnews.fyi/#kapil-suri",
      name: "Kapil Suri",
      jobTitle: "Co-Founder",
      worksFor: { "@id": "https://www.startupnews.fyi/#organization" },
    },
    {
      "@type": "Person",
      "@id": "https://www.startupnews.fyi/#madhur-mohan-malik",
      name: "Madhur Mohan Malik",
      jobTitle: "Co-Founder",
      worksFor: { "@id": "https://www.startupnews.fyi/#organization" },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.startupnews.fyi/#website",
      url: "https://www.startupnews.fyi/",
      name: "StartupNews.fyi",
      description:
        "Latest startup news, funding updates, founder stories, venture capital news, and startup ecosystem insights.",
      publisher: { "@id": "https://www.startupnews.fyi/#organization" },
      inLanguage: "en",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://www.startupnews.fyi/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebPage",
      "@id": "https://www.startupnews.fyi/#webpage",
      url: "https://www.startupnews.fyi/",
      name: "StartupNews.fyi - Startup News, Funding News & Founder Stories",
      isPartOf: { "@id": "https://www.startupnews.fyi/#website" },
      about: { "@id": "https://www.startupnews.fyi/#organization" },
      primaryImageOfPage: { "@id": "https://www.startupnews.fyi/#logo" },
      datePublished: "2019-01-01",
      dateModified: "2026-05-25",
      description:
        "Read the latest startup news, funding announcements, founder journeys, venture capital updates, and startup ecosystem insights from India and around the world.",
      breadcrumb: { "@id": "https://www.startupnews.fyi/#breadcrumb" },
      inLanguage: "en",
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.startupnews.fyi/#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.startupnews.fyi/" },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graphJsonLd) }}
        />
      </head>
      <body>
        <TopLoader />
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <AuthModal />
        <ThemeScript />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-WNYV9VGC9N" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-WNYV9VGC9N');
        `}</Script>
      </body>
    </html>
  );
}
