'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/**
 * Presentation motion for the funding dashboard. GSAP only moves page furniture — cards, sections,
 * ranking bars and metric numbers. Chart internals are left to AG Charts / Recharts.
 * Everything sits in gsap.matchMedia(), so reduced-motion users get the final state with no tweens,
 * and useGSAP reverts every tween and ScrollTrigger on unmount.
 *
 * Markup hooks:
 *   [data-reveal]      fades/rises in once when it scrolls into view
 *   [data-reveal-item] staggered children of a [data-reveal] block
 *   [data-bar]         a ranking bar that grows from the left when its block is revealed
 */
export function usePageReveal(scope: React.RefObject<HTMLElement | null>, ready: boolean) {
  // 1) Sections (still showing skeletons) rise in as they scroll into view — once, from mount.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]', scope.current).forEach((block) => {
          gsap.from(block, { autoAlpha: 0, y: 24, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: block, start: 'top 88%', once: true } });
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  // 2) When the first real data lands: ranking rows stagger in and bars grow, each block on view.
  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]', scope.current).forEach((block) => {
          const items = block.querySelectorAll('[data-reveal-item]');
          const bars = block.querySelectorAll('[data-bar]');
          if (!items.length && !bars.length) return;
          const tl = gsap.timeline({ scrollTrigger: { trigger: block, start: 'top 85%', once: true }, defaults: { ease: 'power3.out' } });
          if (items.length) tl.from(items, { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.05 });
          if (bars.length) tl.from(bars, { scaleX: 0, transformOrigin: 'left center', duration: 0.8, stagger: 0.035 }, items.length ? '-=0.35' : 0);
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [ready] },
  );
}

/** Dims the content while a new country/range is loading, then brings it back (200ms). */
export function useLoadingFade(target: React.RefObject<HTMLElement | null>, loading: boolean) {
  useGSAP(
    () => {
      if (!target.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.to(target.current, { opacity: loading ? 0.55 : 1, duration: 0.2, ease: 'power1.out' });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(target.current, { opacity: loading ? 0.55 : 1 });
      });
      return () => mm.revert();
    },
    { dependencies: [loading], revertOnUpdate: false },
  );
}

/**
 * Counts a number up (first load) or across (when the country changes) by writing textContent,
 * so React does not re-render on every frame. The element must already contain format(value).
 */
export function useCountUp<T extends HTMLElement>(value: number, format: (n: number) => string) {
  const ref = useRef<T>(null);
  const from = useRef(0);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const obj = { v: from.current };
        el.textContent = format(obj.v); // runs before paint, so the final value never flashes first
        gsap.to(obj, {
          v: value,
          duration: from.current === 0 ? 1.1 : 0.6,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = format(obj.v); },
          onComplete: () => { el.textContent = format(value); },
        });
      });
      from.current = value;
      return () => mm.revert();
    },
    { dependencies: [value] },
  );
  return ref;
}
