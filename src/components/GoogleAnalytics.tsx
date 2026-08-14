'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

const GA_MEASUREMENT_ID = 'G-WNYV9VGC9N';

// Internal-only areas: never counted as public traffic (was previously showing up
// as GA landing pages for both real staff sessions and admin-panel scanning bots).
function isInternalRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employee')
  );
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const internal = isInternalRoute(pathname);

  useEffect(() => {
    if (internal) return;
    // Explicit page_path avoids the "(not set)" landing page GA logs when the
    // automatic pageview fires late (after a client-side route change) and
    // can no longer resolve the page location on its own.
    trackEvent('page_view', { page_path: pathname });
  }, [pathname, internal]);

  if (internal) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        gtag('event', 'page_view', { page_path: window.location.pathname });
      `}</Script>
    </>
  );
}
