import Link from 'next/link';
import { connection } from 'next/server';
import { Lock } from 'lucide-react';
import ProChartPrompt from '@/components/user/funding/ProChartPrompt';
import ProPlanBubble from '@/components/user/funding/ProPlanBubble';
import { fiFontCls } from '@/components/user/funding/fonts';
import NumberSystemSync from '@/components/user/funding/NumberSystemSync';
import { getFundingNumberSystem } from '@/modules/funding-deals/service/funding-deals.service';

/** Lock switch for the whole section, currently open. When `true` this guard covers a direct URL
 * visit / bookmark to any /dashboard/funding/* page and the pages are not rendered (no API calls).
 * To lock again: flip this to `true` and add `locked: true` back to the Funding entry in
 * `UserDashboardLayout.tsx`'s `NAV_GROUPS`. */
const FUNDING_LOCKED: boolean = false;

function FundingLockedState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span aria-hidden="true" className="mb-5 flex size-16 items-center justify-center rounded-[20px] bg-violet-50 text-violet-600">
        <Lock className="size-7" strokeWidth={2} />
      </span>
      <h1 className="m-0 mb-2 text-[1.375rem] font-extrabold tracking-tight text-gray-900">Funding is locked</h1>
      <p className="m-0 max-w-[46ch] text-[0.9375rem] leading-relaxed text-gray-500">
        This section isn&apos;t open for browsing yet. Check back soon.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[#ee1761] px-[22px] py-[11px] text-[0.9375rem] font-bold text-white no-underline visited:text-white"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

/** /dashboard/funding/* — funding intelligence for logged-in readers (data: Admin › Funding Data). */
export default async function FundingLayout({ children }: { children: React.ReactNode }) {
  if (FUNDING_LOCKED) return <FundingLockedState />;
  // Amounts follow the admin's Funding Data setting (Lakh/Crore or Million/Billion), read per request.
  await connection();
  const numberSystem = await getFundingNumberSystem();
  // One typeface for the whole section: Calibri (see components/user/funding/fonts.ts).
  // Recharts 3 makes the chart svg and its shapes focusable, so a click drew the browser's black
  // focus ring around the chart / plot area. The recharts-* selectors hide it on every chart here.
  return (
    <div className={`${fiFontCls} min-h-screen min-w-0 overflow-x-clip bg-fi-bg text-fi-ink antialiased [&_.recharts-wrapper]:outline-none [&_.recharts-wrapper_*]:outline-none`}>
      {/* box-border: this dashboard has no Preflight, so w-full + padding would overflow the screen. */}
      <div className="mx-auto box-border flex w-full min-w-0 max-w-[1500px] flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-6 lg:px-7">
        <NumberSystemSync system={numberSystem}>{children}</NumberSystemSync>
      </div>
      <ProPlanBubble />
      {/* Clicking any chart on these pages opens the "Get Pro Plan" popup. */}
      <ProChartPrompt />
    </div>
  );
}
