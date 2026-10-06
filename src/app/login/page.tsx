import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginPage from '@/components/auth/LoginPage';

export const metadata: Metadata = {
  title: 'Login or Sign up | StartupNews.fyi',
  description: 'Sign in or create a free StartupNews.fyi account with Google or email.',
  robots: { index: false, follow: true },
};

/** /login — full-screen reader sign-in / sign-up (bare route: no site header, footer or popup). */
export default function LoginRoute() {
  return (
    // useSearchParams (?tab=signin) needs a Suspense boundary.
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
