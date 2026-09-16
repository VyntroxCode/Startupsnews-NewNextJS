"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { ENS_LOGO } from "./media";
import { EASE, useReducedMotion } from "./hooks";

/** The bar of the site's own header that stays on screen (src/components/Header.tsx). Its wrapper
 * `#mvp-main-head-wrap` is sticky but collapses to 0px tall, because this inner bar is
 * `position: fixed !important` in globals.css — so the bar itself is what gets measured. The event
 * bar pins directly beneath it rather than sliding under it. */
const SITE_HEADER = "#mvp-main-nav-bot";

/** The event's own top bar: the full logo lockup on a soft pink wash, and nothing else — no
 * "Enquire to exhibit" link and no menu (left out of the reference design on request).
 *
 * It sticks just below the site header. The header's height changes with width and with its own
 * scrolled state, so it is measured with a ResizeObserver and handed to CSS as `--ens-nav-top`.
 * Once the bar is pinned it tightens: less padding, a smaller lockup and a shadow. A thin pink line
 * along its bottom edge fills with reading progress. */
export function EnsNav() {
  const reducedMotion = useReducedMotion();
  const navRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const offset = useRef(0);
  const [stuck, setStuck] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });

  const check = () => {
    const sentinel = sentinelRef.current;
    if (sentinel) setStuck(sentinel.getBoundingClientRect().top < offset.current);
  };

  useEffect(() => {
    const nav = navRef.current;
    const header = document.querySelector<HTMLElement>(SITE_HEADER);
    if (!nav) return;
    const measure = () => {
      const position = header ? getComputedStyle(header).position : "";
      offset.current = header && (position === "sticky" || position === "fixed") ? header.offsetHeight : 0;
      nav.style.setProperty("--ens-nav-top", `${offset.current}px`);
      check();
    };
    measure();
    if (!header) return;
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", check);

  return (
    <>
      <span ref={sentinelRef} className="ens-nav-sentinel" aria-hidden="true" />
      <div ref={navRef} className={"ens-nav" + (stuck ? " is-stuck" : "")}>
        <motion.div
          className="ens-nav-inner"
          initial={reducedMotion ? false : { opacity: 0, x: -28, filter: "blur(10px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.05, ease: EASE }}
        >
          <Image
            src={ENS_LOGO.src}
            width={ENS_LOGO.width}
            height={ENS_LOGO.height}
            alt={ENS_LOGO.alt}
            priority
            sizes="(max-width: 760px) 92vw, 700px"
            className="ens-nav-logo"
          />
        </motion.div>
        <motion.span
          className="ens-nav-progress"
          style={{ scaleX: reducedMotion ? scrollYProgress : progress }}
          aria-hidden="true"
        />
      </div>
    </>
  );
}
