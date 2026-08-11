"use client";

import { BannerCarousel } from "./BannerCarousel";
import type { Banner } from "@/modules/banners/domain/types";

export function BannerCarouselClient({ initialBanners }: { initialBanners: Banner[] }) {
  const banners = initialBanners;

  if (banners.length === 0) {
    return (
      <div className="banner-carousel-container" aria-label="Top banner fallback">
        <div className="banner-carousel-wrapper">
          <div className="banner-carousel-slide">
            <img
              src="/images/banner-fallback.svg"
              alt="StartupNews top banner"
              className="banner-carousel-image"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return <BannerCarousel banners={banners} />;
}

