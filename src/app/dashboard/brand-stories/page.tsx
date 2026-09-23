'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

/** Brand Stories has no real content behind it yet (`/api/brand-stories` and
 * `/api/brand-story-sections` both come back empty) — locked at the user's request so no one can
 * land on an empty page. Sidebar shows a lock icon and doesn't navigate here at all; this route
 * guard covers a direct URL visit / bookmark / back-button, so the lock holds either way.
 *
 * The real page (`BrandStoriesPageContent.tsx`) is loaded via `next/dynamic`, not a static
 * import — its `react-pdf` dependency throws at module-evaluation time in this environment (a
 * pre-existing issue, confirmed to happen identically on the unmodified page, unrelated to this
 * lock), so a static import would crash this route even while "locked", since the crash happens
 * on import, before any component ever runs. Dynamic import defers evaluating that file's code
 * until it's actually rendered, which now only happens once `BRAND_STORIES_LOCKED` is false — so
 * fixing that pre-existing react-pdf issue is no longer this lock's problem to solve.
 *
 * To unlock: flip this to `false`, and remove `locked: true` from the Brand Stories entry in
 * `UserDashboardLayout.tsx`'s `NAV_GROUPS`. */
const BRAND_STORIES_LOCKED = true;

const BrandStoriesPageContent = dynamic(() => import('./BrandStoriesPageContent'), { ssr: false });

function BrandStoriesLockedState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span
        aria-hidden="true"
        style={{
          display: 'flex', width: 64, height: 64, borderRadius: 20, marginBottom: 20,
          alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', color: '#7c3aed',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <h1 style={{ margin: '0 0 8px', fontSize: '1.375rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
        Brand Stories is locked
      </h1>
      <p style={{ margin: 0, maxWidth: '46ch', fontSize: '0.9375rem', lineHeight: 1.6, color: '#6b7280' }}>
        There aren&apos;t any brand stories published yet, so this section isn&apos;t open for browsing.
        Check back once the first stories are live.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px',
          borderRadius: 10, background: '#ee1761', color: '#fff', fontWeight: 700, fontSize: '0.9375rem',
          textDecoration: 'none',
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

export default function BrandStoriesPage() {
  if (BRAND_STORIES_LOCKED) {
    return <BrandStoriesLockedState />;
  }
  return <BrandStoriesPageContent />;
}
