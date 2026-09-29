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
    <div className={schibsted.variable}>
      <UserDashboardLayout>{children}</UserDashboardLayout>
    </div>
  );
}
