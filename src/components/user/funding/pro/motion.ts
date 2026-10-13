'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/**
 * All motion for the Pro plan page, in one place. Everything sits in gsap.matchMedia(), so with
 * reduced motion (or if GSAP never runs) the page simply shows its final state, and useGSAP reverts
 * every tween, ScrollTrigger and listener on unmount.
 *
 * Markup hooks (`data-pro="…"`):
 *   glow        background glow; fades in first, then drifts a little as the page scrolls
 *   topbar      logo row
 *   hero        hero card
 *   visual      hero artwork wrapper (entrance)
 *   tilt        membership card; leans towards the pointer inside `stage` (mouse only)
 *   float       small cards around the artwork (entrance); `drift` inside each one bobs slowly
 *   drift       anything that bobs slowly (also the pale disc in the payment card's total panel)
 *   bar         bars of the mini chart; grow from the baseline
 *   word        one word of the hero heading; rises out of its clipped line
 *   hero-text   eyebrow and supporting paragraph
 *   chip        hero benefit chips
 *   block       a card below the hero; rises in once when it scrolls into view. `data-pro-delay`
 *               (seconds) holds it back on first load so the cards follow the hero in order.
 *   item        staggered children of a block
 *   rise        inside a block: heading text that rises out of its clipped line
 *   pop         inside a block: a small icon badge that scales in
 *   grow        inside a block: a bar segment or rule that grows from the left
 *   draw        inside a block: a vertical line that draws from the top
 *   sheen       inside a block: a light band that crosses its panel once
 *   spot        a soft light that follows the mouse inside its `[data-pro-spot-area]` (mouse only)
 */
export function useProPlanMotion(scope: React.RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const q = gsap.utils.selector(scope);
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const loadedAt = performance.now();

        // 1) Hero: one overlapping sequence, done in about 1.4s.
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from(q('[data-pro="glow"]'), { autoAlpha: 0, scale: 0.85, duration: 1.1, stagger: 0.15 }, 0)
          .from(q('[data-pro="topbar"]'), { autoAlpha: 0, y: -10, duration: 0.5 }, 0)
          .from(q('[data-pro="hero"]'), { autoAlpha: 0, y: 26, duration: 0.7 }, 0.05)
          .from(q('[data-pro="visual"]'), { autoAlpha: 0, scale: 0.88, rotation: -5, duration: 0.9 }, 0.2)
          .from(q('[data-pro="word"]'), { yPercent: 115, duration: 0.7, stagger: 0.03 }, 0.3)
          .from(q('[data-pro="bar"]'), { scaleY: 0, transformOrigin: 'bottom', duration: 0.8, stagger: 0.06 }, 0.55)
          .from(q('[data-pro="float"]'), { autoAlpha: 0, y: 16, scale: 0.92, duration: 0.6, stagger: 0.12 }, 0.6)
          .from(q('[data-pro="hero-text"]'), { autoAlpha: 0, y: 14, duration: 0.55, stagger: 0.08 }, 0.6)
          .from(q('[data-pro="chip"]'), { autoAlpha: 0, y: 10, duration: 0.4, stagger: 0.06 }, 0.85);

        // 2) The small cards around the artwork (and one pale disc in the payment card) bob slowly.
        //    The only other loop on the page is the chip marquee in the closing strip (CSS).
        q('[data-pro="drift"]').forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 7 : -7, duration: 3.2 + i * 0.7, ease: 'sine.inOut', repeat: -1, yoyo: true });
        });

        // 3) Cards below the hero rise in once, their items a beat later.
        q('[data-pro="block"]').forEach((block) => {
          const items = block.querySelectorAll('[data-pro="item"]');
          const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
          tl.from(block, { autoAlpha: 0, y: 26, duration: 0.65 });
          if (items.length) tl.from(items, { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.045 }, 0.2);
          const rise = block.querySelectorAll('[data-pro="rise"]');
          const pop = block.querySelectorAll('[data-pro="pop"]');
          if (rise.length) tl.from(rise, { yPercent: 115, duration: 0.65, stagger: 0.09 }, 0.15);
          if (pop.length) tl.from(pop, { scale: 0, autoAlpha: 0, duration: 0.5, ease: 'back.out(1.6)', stagger: 0.12 }, 0.3);
          const grow = block.querySelectorAll('[data-pro="grow"]');
          const draw = block.querySelectorAll('[data-pro="draw"]');
          const sheen = block.querySelectorAll('[data-pro="sheen"]');
          if (grow.length) tl.from(grow, { scaleX: 0, transformOrigin: 'left center', duration: 0.8, stagger: 0.18 }, 0.4);
          if (draw.length) tl.from(draw, { scaleY: 0, transformOrigin: 'top center', duration: 0.9, ease: 'power2.inOut' }, 0.45);
          if (sheen.length) tl.to(sheen, { xPercent: 460, duration: 1.1, ease: 'power2.inOut' }, 0.55);
          ScrollTrigger.create({
            trigger: block,
            start: 'top 90%',
            once: true,
            onEnter: () => {
              // Cards already on screen at load wait their turn after the hero; later ones start at once.
              const onLoad = performance.now() - loadedAt < 500;
              tl.delay(onLoad ? Number(block.dataset.proDelay) || 0 : 0).restart(true);
            },
          });
        });

        // 4) Background glows drift a little with the scroll.
        q('[data-pro="glow"]').forEach((el, i) => {
          gsap.to(el, { yPercent: i % 2 ? -14 : 18, ease: 'none', scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
        });
      });

      // 5) The membership card leans towards the pointer.
      mm.add(`${MOTION_OK} and (pointer: fine)`, () => {
        const stage = q('[data-pro="stage"]')[0] as HTMLElement | undefined;
        const card = q('[data-pro="tilt"]')[0] as HTMLElement | undefined;
        if (!stage || !card) return;
        const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          rotY(((e.clientX - r.left) / r.width - 0.5) * 14);
          rotX(-((e.clientY - r.top) / r.height - 0.5) * 12);
        };
        const onLeave = () => { rotX(0); rotY(0); };
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerleave', onLeave);
        return () => {
          stage.removeEventListener('pointermove', onMove);
          stage.removeEventListener('pointerleave', onLeave);
        };
      });

      // 6) A soft light follows the pointer inside the payment card.
      mm.add(`${MOTION_OK} and (pointer: fine)`, () => {
        const area = q('[data-pro-spot-area]')[0] as HTMLElement | undefined;
        const spot = area?.querySelector<HTMLElement>('[data-pro="spot"]');
        if (!area || !spot) return;
        const toX = gsap.quickTo(spot, 'x', { duration: 0.6, ease: 'power3.out' });
        const toY = gsap.quickTo(spot, 'y', { duration: 0.6, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          const r = area.getBoundingClientRect();
          toX(e.clientX - r.left);
          toY(e.clientY - r.top);
        };
        const onEnter = () => gsap.to(spot, { opacity: 1, duration: 0.4 });
        const onLeave = () => gsap.to(spot, { opacity: 0, duration: 0.5 });
        area.addEventListener('pointermove', onMove);
        area.addEventListener('pointerenter', onEnter);
        area.addEventListener('pointerleave', onLeave);
        return () => {
          area.removeEventListener('pointermove', onMove);
          area.removeEventListener('pointerenter', onEnter);
          area.removeEventListener('pointerleave', onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope },
  );
}
