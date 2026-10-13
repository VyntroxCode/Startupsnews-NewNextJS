"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Banner } from "@/modules/banners/domain/types";

// Keep in sync with the .banner-carousel-slide transition duration in globals.css.
const SLIDE_TRANSITION_MS = 900;
// How long each banner stays up before the next one opens.
const SLIDE_INTERVAL_MS = 4000;

interface BannerCarouselProps {
  banners: Banner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  // `leaving` is the slide that is closing while `current` opens over it.
  const [{ current: currentIndex, leaving: leavingIndex }, setSlides] = useState<{
    current: number;
    leaving: number | null;
  }>({ current: 0, leaving: null });
  // Autoplay holds while the mouse is over the banner or the tab is in the background.
  const [isHovered, setIsHovered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  // Filter active banners that are within their start/end date window
  const now = Date.now();
  const activeBanners = banners.filter((banner) => {
    if (!banner.isActive) return false;
    if (banner.startDate && new Date(banner.startDate).getTime() > now) return false;
    if (banner.endDate && new Date(banner.endDate).getTime() < now) return false;
    return true;
  });

  useEffect(() => {
    const onVisibilityChange = () => setIsTabHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Auto-play carousel. One timeout per slide (re-armed whenever the slide changes or a pause ends)
  // rather than a free-running interval, so every banner gets the same full SLIDE_INTERVAL_MS on
  // screen — an interval kept ticking through a pause or a throttled background tab and then
  // changed the banner at uneven moments.
  const isPaused = isHovered || isTabHidden;
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) {
      return;
    }

    const timeout = setTimeout(() => {
      setSlides((prev) => ({
        current: (prev.current + 1) % activeBanners.length,
        leaving: prev.current,
      }));
    }, SLIDE_INTERVAL_MS);

    return () => clearTimeout(timeout);
  }, [activeBanners.length, isPaused, currentIndex]);

  // Once the closing animation is over, park the old slide back at its start position (off to the
  // right, no transition) so it opens from the right again next time. Must outlast the CSS transition.
  useEffect(() => {
    if (leavingIndex === null) return;
    const timeout = setTimeout(() => {
      setSlides((prev) => (prev.leaving === leavingIndex ? { ...prev, leaving: null } : prev));
    }, SLIDE_TRANSITION_MS + 100);
    return () => clearTimeout(timeout);
  }, [leavingIndex]);

  if (activeBanners.length === 0) {
    return null;
  }

  // Every slide is rendered (inactive ones hidden via CSS) so the server HTML carries all banner
  // images and links — crawlers don't run the autoplay timer, so a current-slide-only render left
  // banners 2+ visible only after JS. Slides are stacked on top of each other (the first one keeps
  // the height) so the closing and the opening slide can animate at the same time. Images past the
  // first load eagerly: a lazy image in a hidden slide only starts downloading once the slide
  // opens, which left the banner blank for part of its turn and made the turns look uneven.
  return (
    <div className="banner-carousel-container">
      {/* Mouse only — on touch a tap would "enter" and leave the carousel stuck paused. */}
      <div
        className="banner-carousel-wrapper"
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setIsHovered(true);
        }}
        onPointerLeave={() => setIsHovered(false)}
      >
        {activeBanners.map((banner, index) => (
          <div
            key={banner.id ?? index}
            className={`banner-carousel-slide${index > 0 ? " banner-carousel-slide--stacked" : ""}${
              index === currentIndex
                ? ""
                : index === leavingIndex
                  ? " banner-carousel-slide--leaving"
                  : " banner-carousel-slide--inactive"
            }`}
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
                  loading={index === 0 ? undefined : "eager"}
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
                  loading={index === 0 ? undefined : "eager"}
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

