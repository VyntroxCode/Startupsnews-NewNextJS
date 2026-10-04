import type { Metadata } from 'next';
import MarketAnalysis from '@/components/user/funding/MarketAnalysis';

export const metadata: Metadata = { title: 'Market Analysis | Funding | StartupNews.fyi', robots: { index: false, follow: false } };

export default function FundingMarketAnalysisRoute() {
  return <MarketAnalysis />;
}
