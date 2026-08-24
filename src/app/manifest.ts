import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StartupNews.fyi",
    short_name: "StartupNews",
    description:
      "Startup news, funding rounds, and tech innovation across AI, fintech, ecommerce, healthtech, and more.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#E72262",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    related_applications: [
      { platform: "webapp", url: `${SITE_URL}/manifest.webmanifest` },
    ],
  };
}
