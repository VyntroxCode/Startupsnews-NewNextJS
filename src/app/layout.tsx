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
import InstallPWA from "@/components/InstallPWA";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ScrollButtons } from "@/components/ScrollButtons";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { BannersService } from "@/modules/banners/service/banners.service";
import { BannersRepository } from "@/modules/banners/repository/banners.repository";
import { entityToBanner } from "@/modules/banners/utils/banners.utils";
import type { Banner } from "@/modules/banners/domain/types";
import { toCdnUrl } from "@/shared/utils/image-cdn";

const bannersRepository = new BannersRepository();
const bannersService = new BannersService(bannersRepository);

async function getActiveBanners(): Promise<Banner[]> {
  try {
    const entities = await bannersService.getActiveBanners();
    return entities.map((e) => {
      const banner = entityToBanner(e);
      banner.imageUrl = toCdnUrl(banner.imageUrl) || banner.imageUrl;
      return banner;
    });
  } catch (error) {
    console.error("Error fetching banners for layout:", error);
    return [];
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// AdSense is production-only. Set NEXT_PUBLIC_ADSENSE_ENABLED=true in the prod
// .env; leave it unset on dev/staging (dev.startupgpt.fyi) so those hosts never
// emit the AdSense meta tag or loader script and don't get linked to the account.
const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const ADSENSE_CLIENT = "ca-pub-2201007872031999";

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
      ...(ADSENSE_ENABLED ? { "google-adsense-account": [ADSENSE_CLIENT] } : {}),
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
      "@id": "https://startupnews.fyi/#organization",
      name: "StartupNews.fyi",
      alternateName: ["StartupNews", "SNFYI"],
      url: "https://startupnews.fyi/",
      logo: {
        "@type": "ImageObject",
        "@id": "https://startupnews.fyi/#logo",
        url: "https://startupnews.fyi/logo.png",
        contentUrl: "https://startupnews.fyi/logo.png",
        caption: "StartupNews.fyi",
        inLanguage: "en",
        width: 9886,
        height: 2062,
      },
      image: { "@id": "https://startupnews.fyi/#logo" },
      description:
        "StartupNews.fyi is one of India's leading startup media and news platforms covering startup news, funding updates, founder stories, venture capital, technology, entrepreneurship, startup ecosystem trends, and global innovation.",
      email: "office@startupnews.fyi",
      foundingDate: "2019",
      founders: [
        { "@id": "https://startupnews.fyi/#kapil-suri" },
        { "@id": "https://startupnews.fyi/#madhur-mohan-malik" },
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
      publishingPrinciples: "https://startupnews.fyi/editorial-policy",
      masthead: "https://startupnews.fyi/about-us",
      ownershipFundingInfo: "https://startupnews.fyi/about-us",
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
      "@id": "https://startupnews.fyi/#kapil-suri",
      name: "Kapil Suri",
      jobTitle: "Co-Founder",
      worksFor: { "@id": "https://startupnews.fyi/#organization" },
    },
    {
      "@type": "Person",
      "@id": "https://startupnews.fyi/#madhur-mohan-malik",
      name: "Madhur Mohan Malik",
      jobTitle: "Co-Founder",
      worksFor: { "@id": "https://startupnews.fyi/#organization" },
    },
    {
      "@type": "WebSite",
      "@id": "https://startupnews.fyi/#website",
      url: "https://startupnews.fyi/",
      name: "StartupNews.fyi",
      description:
        "Latest startup news, funding updates, founder stories, venture capital news, and startup ecosystem insights.",
      publisher: { "@id": "https://startupnews.fyi/#organization" },
      inLanguage: "en",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://startupnews.fyi/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebPage",
      "@id": "https://startupnews.fyi/#webpage",
      url: "https://startupnews.fyi/",
      name: "StartupNews.fyi - Startup News, Funding News & Founder Stories",
      isPartOf: { "@id": "https://startupnews.fyi/#website" },
      about: { "@id": "https://startupnews.fyi/#organization" },
      primaryImageOfPage: { "@id": "https://startupnews.fyi/#logo" },
      datePublished: "2019-01-01",
      dateModified: "2026-05-25",
      description:
        "Read the latest startup news, funding announcements, founder journeys, venture capital updates, and startup ecosystem insights from India and around the world.",
      breadcrumb: { "@id": "https://startupnews.fyi/#breadcrumb" },
      inLanguage: "en",
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://startupnews.fyi/#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://startupnews.fyi/" },
      ],
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const banners = await getActiveBanners();
  return (
    <html lang="en">
      <head>
        {/*
          AdSense loader must be a real <script> in the server-rendered <head>:
          AdSense's site-verification crawler reads the raw HTML, so next/script's
          "afterInteractive" strategy (which only emits a <link rel="preload"> and
          injects the tag after hydration) fails detection. Kept verbatim as Google
          supplies it. Rendered only when NEXT_PUBLIC_ADSENSE_ENABLED=true (prod).
        */}
        {ADSENSE_ENABLED && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graphJsonLd) }}
        />
      </head>
      <body>
        <TopLoader />
        <ConditionalLayout banners={banners}>
          {children}
        </ConditionalLayout>
        {/* Scroll up/down controls. Mounted here rather than inside ConditionalLayout so they
            also reach the admin, dashboard and employee routes, which ConditionalLayout returns
            early for. Order matters: it must sit after ConditionalLayout to clear
            #mvp-site-main's z-index:9999 stacking context, and before AuthModal so the login
            popup still covers it. */}
        <ScrollButtons />
        <InstallPWA />
        <AuthModal />
        <ServiceWorkerRegister />
        <ThemeScript />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
