"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StartupEvent } from "@/lib/data-adapter";
import { EventByCountryCard } from "@/components/EventByCountryCard";
import { getEventImage } from "@/lib/event-utils";

interface EventsCarouselProps {
  events: StartupEvent[];
  maxEvents?: number;
  /** Heading text shown above the carousel. Omit for the default "Startup Events" (homepage
   * usage); pass `null` to render no heading at all (e.g. when a parent heading already covers it). */
  title?: string | null;
  /** Extra class on the outer container, for page-specific card-width overrides (see
   * .event-country-carousel in globals.css, used by /events for a wider "peek the next card" look). */
  className?: string;
}

/**
 * Horizontally-scrollable event row: three cards per row on desktop (two on tablet, one on
 * mobile — widths come from the `.events-carousel-list > .event-by-country-card` CSS rules),
 * scrolled natively (trackpad/touch swipe, mouse-wheel, or click-drag) with smooth momentum,
 * rather than the old click-to-page transform carousel. Prev/next buttons and dots just nudge
 * the same native scroll position by one card at a time.
 */
export function EventsCarousel({ events, maxEvents = 10, title, className = "" }: EventsCarouselProps) {
  const heading = title === undefined ? "Startup Events" : title;
  const displayEvents = events.slice(0, maxEvents);
  const totalEvents = displayEvents.length;

  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [dragging, setDragging] = useState(false);

  const isDragging = useRef(false);
  const draggedRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const autoplayPausedUntil = useRef(0);
  // Hovering any card blocks autoplay outright (not just a timed pause) — set on mouse enter/leave
  // of the row, checked every autoplay tick. Separate from autoplayPausedUntil, which is for a
  // few seconds after a discrete interaction (drag/wheel/button/dot) on devices with no hover.
  const isHovering = useRef(false);

  // Width of one card + the gap after it — the unit every scroll step/snap point moves by.
  const cardStep = useCallback((): number => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = cardStep();
    const max = track.scrollWidth - track.clientWidth;
    setAtStart(track.scrollLeft <= 2);
    setAtEnd(track.scrollLeft >= max - 2);
    if (step > 0) {
      setVisibleCount(Math.max(1, Math.round(track.clientWidth / step)));
      setActiveIndex(Math.round(track.scrollLeft / step));
    }
  }, [cardStep]);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => updateScrollState();
    track.addEventListener("scroll", onScroll, { passive: true });
    // ResizeObserver, not just window resize — catches layout shifts a window resize wouldn't
    // (web font swap reflowing card widths, a sidebar/ad slot changing the track's own width).
    const ro = new ResizeObserver(onScroll);
    ro.observe(track);
    const raf = requestAnimationFrame(updateScrollState);
    return () => {
      track.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [updateScrollState, totalEvents]);

  const maxIndex = Math.max(0, totalEvents - visibleCount);

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(index, maxIndex));
    track.scrollTo({ left: clamped * cardStep(), behavior: "smooth" });
  };

  const goToPrev = () => scrollToIndex(activeIndex - 1);
  const goToNext = () => scrollToIndex(activeIndex + 1);

  const pauseAutoplay = (ms = 4000) => {
    autoplayPausedUntil.current = Date.now() + ms;
  };

  // Gently auto-advances one card at a time, looping back to the start at the end — blocked
  // entirely while the cursor is hovering the row, and paused for a few seconds after any other
  // manual interaction (drag, wheel, buttons, dots) on devices with no hover.
  useEffect(() => {
    if (totalEvents <= visibleCount) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const track = trackRef.current;
      if (!track || isHovering.current || Date.now() < autoplayPausedUntil.current) return;
      const max = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= max - 2) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: cardStep(), behavior: "smooth" });
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [totalEvents, visibleCount, cardStep]);

  // Click-and-drag scrolling for desktop mouse users (touch/trackpad already scroll natively).
  // Deliberately no vertical-wheel-to-horizontal-scroll hijack here (there used to be one) —
  // it captured every plain mouse-wheel tick over the row, which meant normal page scrolling
  // stopped working the moment the cursor crossed over a card. Horizontal movement is still
  // fully available via drag, a trackpad's native horizontal swipe, and the arrow buttons/dots.
  const handlePointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    if (!track || e.pointerType !== "mouse") return;
    isDragging.current = true;
    setDragging(true);
    draggedRef.current = false;
    dragStartX.current = e.clientX;
    dragStartScroll.current = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
    pauseAutoplay();
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    if (!track || !isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    // A real drag, not just the couple of pixels of mouse jitter a normal click naturally has —
    // 3px was low enough that plain clicks kept getting misread as drags and silently swallowed
    // (see handleClickCapture), breaking navigation into the card entirely.
    if (Math.abs(dx) > 10) draggedRef.current = true;
    track.scrollLeft = dragStartScroll.current - dx;
  };
  const endDrag = () => {
    isDragging.current = false;
    setDragging(false);
  };
  // Swallow the click that follows a drag so it doesn't also open the card underneath the cursor.
  const handleClickCapture = (e: React.MouseEvent<HTMLUListElement>) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  };
  const handleTouchStart = () => pauseAutoplay(2500);
  const handleMouseEnter = () => { isHovering.current = true; };
  const handleMouseLeave = () => { isHovering.current = false; };

  if (totalEvents === 0) {
    return (
      <div className="events-carousel-empty">
        <p>No upcoming events at this time.</p>
      </div>
    );
  }

  const showControls = totalEvents > visibleCount;

  return (
    <div className={`events-carousel-container ${className}`.trim()}>
      <div className="events-carousel-header">
        {heading && <h2 className="events-carousel-title">{heading}</h2>}
        {showControls && (
          <div className="events-carousel-controls">
            <button
              type="button"
              className="events-carousel-btn events-carousel-btn-prev"
              onClick={() => { pauseAutoplay(); goToPrev(); }}
              disabled={atStart}
              aria-label="Previous events"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="events-carousel-btn events-carousel-btn-next"
              onClick={() => { pauseAutoplay(); goToNext(); }}
              disabled={atEnd}
              aria-label="Next events"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <ul
        ref={trackRef}
        className="events-carousel-list scrollbar-hide"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        onTouchStart={handleTouchStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        {displayEvents.map((event, index) => (
          <EventByCountryCard
            key={String(event.id ?? event.slug ?? `${event.url}-${index}`)}
            event={event}
            imageUrl={getEventImage(event)}
          />
        ))}
      </ul>

      {showControls && (
        <div className="events-carousel-dots">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`events-carousel-dot ${index === activeIndex ? "active" : ""}`}
              onClick={() => { pauseAutoplay(); scrollToIndex(index); }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
