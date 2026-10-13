import type { Metadata } from 'next';
import ProPlanPage from '@/components/user/funding/pro/ProPlanPage';

export const metadata: Metadata = {
  title: 'Pro Plan | StartupNews.fyi',
  robots: { index: false, follow: false },
};

/** /dashboard/pro — the Pro plan page, opened from the floating "Get Pro Plan" bubble on the Funding pages.
 * Full-screen (UserDashboardLayout renders it without the sidebar). */
export default function DashboardProPlanPage() {
  return <ProPlanPage />;
}
