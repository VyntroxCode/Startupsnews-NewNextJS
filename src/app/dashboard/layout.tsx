import UserDashboardLayout from '@/components/user/UserDashboardLayout';

export const metadata = { title: 'My Dashboard | StartupNews.fyi' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <UserDashboardLayout>{children}</UserDashboardLayout>;
}
