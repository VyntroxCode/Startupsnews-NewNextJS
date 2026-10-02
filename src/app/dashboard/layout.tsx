import UserDashboardLayout from '@/components/user/UserDashboardLayout';
// Shared isolated Tailwind sheet (theme + utilities only, no Preflight) — DashboardHome.tsx is
// listed as an @source there, so only the classes it uses get generated.
import '../isolated-tailwind.css';

import type { Metadata } from 'next';
import localFont from 'next/font/local';

// Dashboard-only typeface — Schibsted Grotesk (drawn for a news publisher) replaces the
// "Garnett" stack, which never actually loaded (no @font-face anywhere) and so fell back to
// Helvetica/Arial. Exposed as --font-schibsted and consumed via the `font-db` utility.
// Self-hosted (src/fonts, latin variable file) rather than next/font/google: see src/fonts/README.md.
const schibsted = localFont({
  src: '../../fonts/schibsted-grotesk-latin-var.woff2',
  weight: '400 900',
  display: 'swap',
  variable: '--font-schibsted',
});

// Sidebar-only typeface — Inter, matching the Octaraa-style sidebar reference. Exposed as
// --font-db-inter and consumed via the `font-db-nav` utility (see isolated-tailwind.css).
const inter = localFont({
  src: '../../fonts/inter-latin-var.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-db-inter',
});

export const metadata: Metadata = {
  title: 'My Dashboard | StartupNews.fyi',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // `leading-normal`: the legacy theme sets `body { line-height: 100% }`, which computes to a
    // fixed 16px that every element inherits, so any text bigger than 16px without its own
    // line-height (page titles, the profile wizard heading) overlapped the line below it. A
    // unitless 1.5 here scales with each element's own font size across the whole dashboard.
    <div className={`${schibsted.variable} ${inter.variable} leading-normal`}>
      <UserDashboardLayout>{children}</UserDashboardLayout>
    </div>
  );
}
