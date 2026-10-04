import type { Metadata } from 'next';
import FundingDashboard from '@/components/user/funding/FundingDashboard';

export const metadata: Metadata = {
  title: 'Funding | StartupNews.fyi',
  robots: { index: false, follow: false },
};

/** /dashboard/funding — the funding Dashboard (overview, filters, KPIs, breakdowns, 12-month outlook). */
export default function DashboardFundingPage() {
  return <FundingDashboard />;
}
