import UserDashboardLayout from '@/components/user/UserDashboardLayout';
// Shared isolated Tailwind sheet (theme + utilities only, no Preflight) — DashboardHome.tsx is
// listed as an @source there, so only the classes it uses get generated.
import '../isolated-tailwind.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Dashboard | StartupNews.fyi',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <UserDashboardLayout>{children}</UserDashboardLayout>;
}
