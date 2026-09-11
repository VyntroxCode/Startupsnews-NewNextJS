import UserDashboardLayout from '@/components/user/UserDashboardLayout';

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
