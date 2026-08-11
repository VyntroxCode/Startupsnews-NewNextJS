'use client';

import { usePathname } from 'next/navigation';
import { FlyMenu } from "@/components/FlyMenu";
import { FlyMenuProvider } from "@/components/FlyMenuContext";
import { FlyMenuFade } from "@/components/FlyMenuFade";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarouselClient } from "@/components/BannerCarouselClient";
import { AngleUpIcon } from "@/components/icons";
import type { Banner } from "@/modules/banners/domain/types";

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

  // For admin/dashboard routes, render only the children (their layouts handle structure)
  if (isAdminRoute || isDashboardRoute) {
    return <>{children}</>;
  }

  // Show banner on all frontend pages.
  const showBanner = true;

  // For frontend routes, render the full layout with Header, Footer, etc.
  return (
    <FlyMenuProvider>
      <FlyMenu />
      <div id="mvp-site" className="left relative">
        <div id="mvp-site-wall" className="left relative">
          <div id="mvp-site-main" className="left relative">
            <Header />
            {showBanner && <BannerCarouselClient initialBanners={banners} />}
            <div id="mvp-main-body-wrap" className="left relative">
              {children}
            </div>
            <Footer />
          </div>
        </div>
      </div>
      <div className="mvp-fly-top back-to-top">
        <AngleUpIcon />
      </div>
      <FlyMenuFade />
    </FlyMenuProvider>
  );
}

