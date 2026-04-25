import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "Are you sure you want to delete your account? This action cannot be undone.",
  alternates: { canonical: `${SITE_URL}/delete-your-account` },
  openGraph: {
    title: "Delete Your Account | StartupNews.fyi",
    description: "Are you sure you want to delete your account? This action cannot be undone.",
    url: `${SITE_URL}/delete-your-account`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
