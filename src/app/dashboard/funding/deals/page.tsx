import type { Metadata } from 'next';
import AllDealsPage from '@/components/user/funding/AllDealsPage';

export const metadata: Metadata = { title: 'All Deals | Funding | StartupNews.fyi', robots: { index: false, follow: false } };

export default function FundingDealsPage() {
  return <AllDealsPage />;
}
