'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Global Top Loader Bar Component
 * 
 * Shows a progress bar at the top of the page during route navigation.
 * Works globally across all routes (frontend and admin).
 * 
 * Features:
 * - Automatically shows on route changes
 * - Smooth animations with realistic progress simulation
 * - Non-intrusive design (3px height, fixed at top)
 * - Works with Next.js App Router navigation
 * - Handles edge cases (rapid navigation, same route clicks)
 */
export function TopLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if pathname hasn't actually changed (e.g., same route navigation)
    if (previousPathnameRef.current === pathname) {
      return;
    }

    // Update previous pathname
    previousPathnameRef.current = pathname;

    // Clean up any existing timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset loading state when pathname changes
    setLoading(true);
    setProgress(0);

    // Simulate realistic progress for smooth animation
    // Progress accelerates at start, then slows down near completion
    let currentProgress = 0;
    
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 15 + 5; // Random increment between 5-20
      
      // Slow down as we approach 90%
      if (currentProgress > 70) {
        currentProgress += Math.random() * 3 + 1; // Smaller increments near end
      }
      
      if (currentProgress >= 90) {
        currentProgress = 90; // Cap at 90% until navigation completes
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      
      setProgress(currentProgress);
    }, 100);

    // Complete the progress when navigation is done
    // Next.js App Router typically completes navigation quickly, but we give it time
    timeoutRef.current = setTimeout(() => {
      setProgress(100);
      
      // Fade out after completion
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 150); // Short delay since Next.js navigation is fast

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pathname]);

  // Don't render if not loading and progress is 0
  if (!loading && progress === 0) {
    return null;
  }

  return (
    <div
      className="top-loader-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 99999,
        pointerEvents: 'none',
        opacity: loading ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
      }}
    >
      <div
        className="top-loader-bar"
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.5), 0 0 5px rgba(139, 92, 246, 0.3)',
          transition: 'width 0.2s ease-out',
          transform: 'translateZ(0)', // Hardware acceleration
          willChange: 'width',
        }}
      />
    </div>
  );
}

