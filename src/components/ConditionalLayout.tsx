'use client';

import { usePathname } from 'next/navigation';
import { FlyMenu } from "@/components/FlyMenu";
import { FlyMenuProvider } from "@/components/FlyMenuContext";
import { FlyMenuFade } from "@/components/FlyMenuFade";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarouselClient } from "@/components/BannerCarouselClient";
import { DelegationStrip } from "@/components/DelegationStrip";
import type { Banner } from "@/modules/banners/domain/types";

/** Event landing pages that bring their own top bar. They render without the site header, the
 * banner carousel or the footer, so the page opens on its own first strip and ends on its own
 * closing section; `is-bare-route` on the body wrapper lets the page drop the 72px padding that
 * otherwise clears the fixed site header (see expand-north-star.css). Exported so other site chrome
 * that shouldn't appear on these pages either — the scroll-triggered login popup, see AuthModal.tsx
 * — can check the same list instead of keeping a second one that could drift out of step. */
export const BARE_ROUTES = ['/expand-north-star'];

/** Whether `pathname` is one of `BARE_ROUTES`, or a sub-path of one. */
export function isBareRoute(pathname: string | null): boolean {
  return BARE_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));
}

export default function ConditionalLayout({
  children,
  banners,
}: {
  children: React.ReactNode;
  banners: Banner[];
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isEmployeeRoute = pathname?.startsWith('/employee');

  // For admin/dashboard/employee routes, render only the children (their layouts handle structure)
  if (isAdminRoute || isDashboardRoute || isEmployeeRoute) {
    return <>{children}</>;
  }

  const bareRoute = isBareRoute(pathname);

  // Show banner on all frontend pages except the bare event pages.
  const showBanner = !bareRoute;

  // The delegation announcement strip runs on the home page only, fixed at the very top of the
  // screen ABOVE the site header (moved up from between the header and the banner, 2026-09-19).
  // Rendered before <Header /> so delegation-strip.css can push the header, the banner and the body
  // wrap down by the strip's height with sibling selectors.
  const showDelegationStrip = pathname === '/';

  // For frontend routes, render the full layout with Header, Footer, etc.
  return (
    <FlyMenuProvider>
      <FlyMenu />
      <div id="mvp-site" className="left relative">
        <div id="mvp-site-wall" className="left relative">
          <div id="mvp-site-main" className="left relative">
            {showDelegationStrip && <DelegationStrip />}
            {!bareRoute && <Header />}
            {showBanner && <BannerCarouselClient initialBanners={banners} />}
            <div id="mvp-main-body-wrap" className={"left relative" + (bareRoute ? " is-bare-route" : "")}>
              {children}
            </div>
            {/* Bare event pages carry no site footer either (2026-09-19). */}
            {!bareRoute && <Footer />}
          </div>
        </div>
      </div>
      {/* The theme's `.mvp-fly-top` back-to-top button used to render here. It never worked in
          the Next.js port — the jQuery that toggled `.mvp-to-top` to slide it into view was
          never carried over, so it stayed translated 100px off-screen, and media-queries.css
          hides it entirely below 1004px. Replaced by <ScrollButtons /> in the root layout,
          which covers every route and offers scroll-down as well. */}
      <FlyMenuFade />
    </FlyMenuProvider>
  );
}

