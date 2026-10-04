import localFont from 'next/font/local';
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

/** /dashboard/funding/* — funding intelligence for logged-in readers (data: Admin › Funding Data). */
export default function FundingLayout({ children }: { children: React.ReactNode }) {
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
