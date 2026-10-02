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

  // Filter active banners that are within their start/end date window
  const now = Date.now();
  const activeBanners = banners.filter((banner) => {
    if (!banner.isActive) return false;
    if (banner.startDate && new Date(banner.startDate).getTime() > now) return false;
    if (banner.endDate && new Date(banner.endDate).getTime() < now) return false;
    return true;
  });

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

  // Every slide is rendered (inactive ones hidden via CSS) so the server HTML carries all banner
  // images and links — crawlers don't run the autoplay timer, so a current-slide-only render left
  // banners 2+ visible only after JS. Hidden slides' lazy images don't download until shown.
  return (
    <div className="banner-carousel-container">
      <div className="banner-carousel-wrapper">
        {activeBanners.map((banner, index) => (
          <div
            key={banner.id ?? index}
            className={`banner-carousel-slide${index === currentIndex ? "" : " banner-carousel-slide--inactive"}`}
            aria-hidden={index === currentIndex ? undefined : true}
          >
            {banner.linkUrl ? (
              <Link
                href={banner.linkUrl}
                className="banner-carousel-link"
                tabIndex={index === currentIndex ? undefined : -1}
              >
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  className="banner-carousel-image"
                  priority={index === 0}
                  sizes="100vw"
                />
                <div className="banner-carousel-overlay">
                  <div className="banner-carousel-content">
                    <div className="banner-carousel-title">{banner.title}</div>
                    {banner.description && (
                      <p className="banner-carousel-description">{banner.description}</p>
                    )}
                    {banner.linkText && (
                      <span className="banner-carousel-link-text">{banner.linkText} →</span>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="banner-carousel-slide-inner">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  className="banner-carousel-image"
                  priority={index === 0}
                  sizes="100vw"
                />
                <div className="banner-carousel-overlay">
                  <div className="banner-carousel-content">
                    <div className="banner-carousel-title">{banner.title}</div>
                    {banner.description && (
                      <p className="banner-carousel-description">{banner.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

