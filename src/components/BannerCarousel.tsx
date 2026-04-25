"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Banner } from "@/modules/banners/domain/types";

interface BannerCarouselProps {
  banners: Banner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter active banners
  const activeBanners = banners.filter((banner) => banner.isActive);

  // Auto-play carousel
  useEffect(() => {
    if (activeBanners.length <= 1) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 4000); // Change slide every 4 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeBanners.length]);



  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex];

  return (
    <div className="banner-carousel-container">
      <div className="banner-carousel-wrapper">


        <div className="banner-carousel-slide">
          {currentBanner.linkUrl ? (
            <Link href={currentBanner.linkUrl} className="banner-carousel-link">
              <Image
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                fill
                className="banner-carousel-image"
                priority={currentIndex === 0}
                sizes="100vw"
                unoptimized
              />
              <div className="banner-carousel-overlay">
                <div className="banner-carousel-content">
                  <h2 className="banner-carousel-title">{currentBanner.title}</h2>
                  {currentBanner.description && (
                    <p className="banner-carousel-description">{currentBanner.description}</p>
                  )}
                  {currentBanner.linkText && (
                    <span className="banner-carousel-link-text">{currentBanner.linkText} →</span>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="banner-carousel-slide-inner">
              <Image
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                fill
                className="banner-carousel-image"
                priority={currentIndex === 0}
                sizes="100vw"
                unoptimized
              />
              <div className="banner-carousel-overlay">
                <div className="banner-carousel-content">
                  <h2 className="banner-carousel-title">{currentBanner.title}</h2>
                  {currentBanner.description && (
                    <p className="banner-carousel-description">{currentBanner.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}

