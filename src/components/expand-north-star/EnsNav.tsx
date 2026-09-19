"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { DUBAI_KONNECT_LOGO, ENS_LOGO } from "./media";
import { EASE, useReducedMotion } from "./hooks";

/** The bar of the site's own header that stays on screen (src/components/Header.tsx). Its wrapper
 * `#mvp-main-head-wrap` is sticky but collapses to 0px tall, because this inner bar is
 * `position: fixed !important` in globals.css — so the bar itself is what gets measured. The event
 * bar pins directly beneath it rather than sliding under it.
 *
 * This route is currently rendered WITHOUT the site header (BARE_ROUTES in ConditionalLayout), so
 * that lookup finds nothing; the bar pins directly under the sticky delegation band instead (see
 * DELEGATION_BAND). The header measuring stays so the bar still behaves if it is brought back. */
const SITE_HEADER = "#mvp-main-nav-bot";

/** The sticky "Startup Delegation to Dubai" band above the bar (EnsDelegationTitle). */
const DELEGATION_BAND = ".ens-delegation-band";

/** The closing enquiry form (PlanYourJourney) — where "Participate Now" lands. */
const PARTICIPATE_TARGET = "ens-participate";

/** The event's own top bar: the full logo lockup on a soft pink wash, followed by the
 * "Launchpad Middle East" mark, the Dubai Konnect logo and a "Participate Now" button that takes
 * the reader to the enquiry form at the foot of the page. No menu and no "Enquire to exhibit" link
 * (both left out of the reference design on request).
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
    // 1px of slack: at the top of the page the sentinel sits exactly on the band's bottom edge, and
    // sub-pixel rounding would otherwise flip the bar into its pinned state before anything scrolled.
    if (sentinel) setStuck(sentinel.getBoundingClientRect().top < offset.current - 1);
  };

  useEffect(() => {
    const nav = navRef.current;
    const header = document.querySelector<HTMLElement>(SITE_HEADER);
    const band = document.querySelector<HTMLElement>(DELEGATION_BAND);
    if (!nav) return;
    // Everything pinned above the bar: the site header (when this route renders one) plus the
    // sticky delegation band. Both change height — the header with width and scroll state, the
    // band when it tightens after the page scrolls — so both are watched.
    const pinnedHeight = (el: HTMLElement | null) => {
      if (!el) return 0;
      const position = getComputedStyle(el).position;
      return position === "sticky" || position === "fixed" ? el.getBoundingClientRect().height : 0;
    };
    const measure = () => {
      offset.current = pinnedHeight(header) + pinnedHeight(band);
      nav.style.setProperty("--ens-nav-top", `${offset.current}px`);
      check();
    };
    measure();
    const observer = new ResizeObserver(measure);
    // border-box: the band tightens by changing its padding, which leaves its content box — the
    // default thing a ResizeObserver watches — the same size, so it would never report the change.
    if (header) observer.observe(header, { box: "border-box" });
    if (band) observer.observe(band, { box: "border-box" });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", check);

  /** Scroll to the enquiry form, clearing everything pinned above it — `scrollIntoView` would park
   * the form's opening line underneath this bar and the delegation band. `offset.current` is
   * already the height of that pinned stack above the bar, so only the bar itself is added.
   * `.ens-journey`'s `scroll-margin-top` covers the plain-anchor fallback when JS hasn't run. */
  const goToForm = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(PARTICIPATE_TARGET);
    if (!target) return; // let the browser follow the href
    event.preventDefault();
    const barHeight = navRef.current?.getBoundingClientRect().height ?? 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset.current - barHeight - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: reducedMotion ? "auto" : "smooth" });
  };

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
          <span className="ens-nav-divider" aria-hidden="true" />
          {/* The programme's own mark, set as type rather than an image so it stays sharp at every
              size and is read out as text: heavy Montserrat in cream with a warm neon glow, straight
              on the bar's pink wash (no tile behind it). */}
          <motion.p
            className="ens-nav-launchpad"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
          >
            <span>Launchpad</span>
            <span>Middle East</span>
          </motion.p>
          <span className="ens-nav-divider ens-nav-divider-konnect" aria-hidden="true" />
          <motion.span
            className="ens-nav-konnect"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
          >
            <Image
              src={DUBAI_KONNECT_LOGO.src}
              width={DUBAI_KONNECT_LOGO.width}
              height={DUBAI_KONNECT_LOGO.height}
              alt={DUBAI_KONNECT_LOGO.alt}
              priority
              sizes="(max-width: 760px) 90px, 150px"
              className="ens-nav-konnect-img"
            />
          </motion.span>
          {/* Right of the Konnect logo: the bar's one action. Outside the logo row's shrinking
              lockup (`flex: none`), so it keeps its size as the bar narrows. */}
          <motion.a
            href={`#${PARTICIPATE_TARGET}`}
            className="ens-nav-cta"
            onClick={goToForm}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
          >
            Participate Now
          </motion.a>
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
