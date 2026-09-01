import type { Metadata } from "next";
import { IncubatxDossierForm } from "@/components/incubatx/IncubatxDossierForm";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// Internal intake form — always noindex regardless of the site-wide ROBOTS_NOINDEX env gate
// that layout.tsx otherwise applies (see src/app/layout.tsx's root `robots` block).
export const metadata: Metadata = {
  title: "Startup Dossier — IncubatX",
  description:
    "Submit your startup's full profile once, so the IncubatX team can reuse it to file multiple government grant applications (DPIIT, state startup schemes, and more).",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/incubatx/startup-details` },
  openGraph: {
    title: "Startup Dossier — IncubatX",
    description: "One profile, reused across every grant application IncubatX files on your behalf.",
    url: `${SITE_URL}/incubatx/startup-details`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};

export default function IncubatxStartupDetailsPage() {
  return (
    <div className="incubatx-page" id="incubatx-root">
      <div className="ix-hero">
        <div className="ix-hero-kicker">IncubatX · Startup Intake</div>
        <h1>Startup dossier</h1>
      </div>
      <IncubatxDossierForm />
    </div>
  );
}
