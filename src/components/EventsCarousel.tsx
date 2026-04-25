"use client";

import { useState, useRef, useEffect } from "react";
import type { StartupEvent } from "@/lib/data-adapter";
import { EventByCountryCard } from "@/components/EventByCountryCard";
import { getEventImage } from "@/lib/event-utils";

interface EventsCarouselProps {
  events: StartupEvent[];
  maxEvents?: number;
}

export function EventsCarousel({ events, maxEvents = 10 }: EventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPauseUntilRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMobileRef = useRef(false);

  // Limit events to maxEvents
  const displayEvents = events.slice(0, maxEvents);
  const totalEvents = displayEvents.length;

  // Calculate how many cards to show per view based on screen size
  const [cardsPerView, setCardsPerView] = useState(1);

  useEffect(() => {
    const updateCardsPerView = () => {
      const container = carouselRef.current;
      if (!container) return;

      // Use both container width and window width for reliable detection
      const containerWidth = container.offsetWidth;
      const windowWidth = window.innerWidth;
      const effectiveWidth = containerWidth > 0 ? containerWidth : windowWidth;
      
      console.log('[EventsCarousel] updateCardsPerView - containerWidth:', containerWidth, 'windowWidth:', windowWidth, 'effectiveWidth:', effectiveWidth);
      
      // Mobile: 1 card, Tablet: 2 cards, Desktop: 3 cards
      let newCardsPerView = 1;
      if (effectiveWidth >= 1024) {
        newCardsPerView = 3;
      } else if (effectiveWidth >= 768) {
        newCardsPerView = 2;
      } else {
        newCardsPerView = 1;
      }

      console.log('[EventsCarousel] newCardsPerView:', newCardsPerView, 'isMobile:', newCardsPerView === 1);
      isMobileRef.current = newCardsPerView === 1;
      setCardsPerView(newCardsPerView);
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    
    // Also update after a short delay to account for DOM layout
    const timeoutId = window.setTimeout(updateCardsPerView, 100);
    
    return () => {
      window.removeEventListener('resize', updateCardsPerView);
      clearTimeout(timeoutId);
    };
  }, [displayEvents.length]);

  const maxIndex = Math.max(0, totalEvents - cardsPerView);

  // Keep current index valid when viewport size or data length changes.
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  // Auto-scroll interval setup - simplified and more robust
  useEffect(() => {
    // Only set up autoplay if we have multiple events
    if (totalEvents <= 1) {
      console.log('[EventsCarousel] Skipping autoplay - totalEvents <= 1');
      return;
    }

    // Clean up any existing interval before creating a new one
    if (intervalRef.current) {
      console.log('[EventsCarousel] Clearing existing interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    console.log('[EventsCarousel] Setting up autoplay interval - totalEvents:', totalEvents, 'isMobile:', isMobileRef.current);

    // Set up autoplay interval
    const intervalId = window.setInterval(() => {
      // Only advance if on mobile view
      if (!isMobileRef.current) {
        return;
      }

      // Skip if paused due to user interaction
      if (Date.now() < autoPauseUntilRef.current) {
        console.log('[EventsCarousel] Skipping advance - paused');
        return;
      }
      
      console.log('[EventsCarousel] Auto-advancing carousel, maxIndex:', maxIndex);
      setCurrentIndex((prev) => {
        const nextIndex = prev >= maxIndex ? 0 : prev + 1;
        console.log('[EventsCarousel] Advancing: ' + prev + ' -> ' + nextIndex);
        return nextIndex;
      });
    }, 4000);

    intervalRef.current = intervalId as any;
    console.log('[EventsCarousel] Autoplay interval started with ID:', intervalId);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[EventsCarousel] Autoplay interval cleaned up');
      }
    };
  }, [totalEvents, maxIndex]);

  const pauseAutoplayTemporarily = (ms: number = 5000) => {
    autoPauseUntilRef.current = Date.now() + ms;
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    pauseAutoplayTemporarily();
    setIsDragging(true);
    setStartX(e.pageX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const distance = x - startX;
    
    // Dragging right moves to previous card, dragging left moves to next card
    if (Math.abs(distance) > 50) {
      const direction = distance > 0 ? -1 : 1;
      if (direction > 0) {
        goToNext();
      } else {
        goToPrev();
      }
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!carouselRef.current) return;
    pauseAutoplayTemporarily();
    setIsDragging(true);
    setStartX(e.touches[0].pageX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX;
    const distance = x - startX;
    
    // Dragging right moves to previous card, dragging left moves to next card
    if (Math.abs(distance) > 50) {
      const direction = distance > 0 ? -1 : 1;
      if (direction > 0) {
        goToNext();
      } else {
        goToPrev();
      }
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    pauseAutoplayTemporarily(2500);
    setIsDragging(false);
  };

  if (totalEvents === 0) {
    return (
      <div className="events-carousel-empty">
        <p>No upcoming events at this time.</p>
      </div>
    );
  }

  return (
    <div className="events-carousel-container">
      <div className="events-carousel-header">
        <h2 className="events-carousel-title">Startup Events</h2>
        {totalEvents > cardsPerView && (
          <div className="events-carousel-controls">
            <button
              type="button"
              className="events-carousel-btn events-carousel-btn-prev"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Previous events"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
           {/* <span className="text-[0.875rem] text-[#666] font-medium min-w-[50px] text-center">
              {currentIndex + 1} / {maxIndex + 1}
            </span> */}
            <button
              type="button"
              className="events-carousel-btn events-carousel-btn-next"
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next events"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div
        ref={carouselRef}
        className="events-carousel-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <ul
          className="events-carousel-list"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% - ${currentIndex * 20}px))`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {displayEvents.map((event, index) => (
            <EventByCountryCard
              key={String(event.id ?? event.slug ?? `${event.url}-${index}`)}
              event={event}
              imageUrl={getEventImage(event)}
            />
          ))}
        </ul>
      </div>

      {/* Dots indicator for mobile */}
      {totalEvents > cardsPerView && (
        <div className="events-carousel-dots">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`events-carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

