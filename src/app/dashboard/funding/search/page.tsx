import type { Metadata } from 'next';
import SearchPage from '@/components/user/funding/SearchPage';

export const metadata: Metadata = { title: 'Search | Funding | StartupNews.fyi', robots: { index: false, follow: false } };

export default function FundingSearchPageRoute() {
  return <SearchPage />;
}
