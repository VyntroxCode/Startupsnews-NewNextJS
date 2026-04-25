"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type StickyState = 'normal' | 'fixed' | 'bottom';

export function StickySidebarContent({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<StickyState>('normal');
  const [width, setWidth] = useState<number>(0);

  const handleScroll = useCallback(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    // Get the sidebar container (parent of wrapper)
    const sidebarContainer = wrapper.closest('#mvp-side-wrap') as HTMLElement;
    if (!sidebarContainer) return;

    const containerRect = sidebarContainer.getBoundingClientRect();
    const contentHeight = content.offsetHeight;
    /* Match header height (~72px) + small gap so whole box shows below navbar */
    const stickyTop = 88;

    // Calculate boundaries
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;

    // When should content stop at bottom? When the bottom of content would go past container bottom
    const bottomThreshold = containerBottom - contentHeight - stickyTop;

    setWidth(wrapper.offsetWidth);

    if (containerTop > stickyTop) {
      // Container hasn't reached sticky point yet - normal flow
      setState('normal');
    } else if (bottomThreshold < 0) {
      // Content would overflow container - stick to bottom
      setState('bottom');
    } else {
      // Stick to viewport
      setState('fixed');
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    // Initial calculation
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll]);

  const getStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      zIndex: 100,
    };

    switch (state) {
      case 'fixed':
        return {
          ...baseStyles,
          position: 'fixed',
          top: '88px',
          width: width ? `${width}px` : '100%',
        };
      case 'bottom':
        return {
          ...baseStyles,
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="sticky-sidebar-wrapper"
      style={{
        position: 'relative',
        height: '100%', // Take full height of parent
      }}
    >
      <div
        ref={contentRef}
        className="sticky-sidebar-content"
        style={getStyles()}
      >
        {children}
      </div>
    </div>
  );
}
