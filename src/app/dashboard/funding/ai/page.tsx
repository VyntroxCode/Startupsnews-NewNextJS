import type { Metadata } from 'next';
import AiAssistant from '@/components/user/funding/AiAssistant';

export const metadata: Metadata = { title: 'AI Assistant | Funding | StartupNews.fyi', robots: { index: false, follow: false } };

export default function FundingAiAssistantRoute() {
  return <AiAssistant />;
}
