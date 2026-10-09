import Link from 'next/link';
import localFont from 'next/font/local';
import { Lock } from 'lucide-react';
import FundingSubNav from '@/components/user/funding/FundingSubNav';

// The funding-platform preview's type: Space Grotesk (headings, big numbers) and IBM Plex Mono
// (amounts, dates). Inter (body) comes from src/app/dashboard/layout.tsx. Self-hosted, see src/fonts/README.md.
const spaceGrotesk = localFont({
  src: '../../../fonts/space-grotesk-latin-var.woff2',
  weight: '300 700',
  display: 'swap',
  variable: '--font-fi-space',
});

const plexMono = localFont({
  src: [
    { path: '../../../fonts/ibm-plex-mono-latin-400.woff2', weight: '400' },
    { path: '../../../fonts/ibm-plex-mono-latin-500.woff2', weight: '500' },
    { path: '../../../fonts/ibm-plex-mono-latin-600.woff2', weight: '600' },
  ],
  display: 'swap',
  variable: '--font-fi-plex',
});

/** Lock switch for the whole section, currently open. When `true` this guard covers a direct URL
 * visit / bookmark to any /dashboard/funding/* page and the pages are not rendered (no API calls).
 * To lock again: flip this to `true` and add `locked: true` to the Funding entry in
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
export default function FundingLayout({ children }: { children: React.ReactNode }) {
  if (FUNDING_LOCKED) return <FundingLockedState />;
  return (
    <div className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen min-w-0 overflow-x-clip bg-fi-bg font-(family-name:--font-db-inter) text-fi-ink antialiased`}>
      {/* box-border: this dashboard has no Preflight, so w-full + padding would overflow the screen. */}
      <div className="mx-auto box-border flex w-full min-w-0 max-w-[1500px] flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-6 lg:px-7">
        <FundingSubNav />
        {children}
      </div>
    </div>
  );
}
