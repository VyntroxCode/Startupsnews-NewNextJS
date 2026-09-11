"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { fundingImages } from "./images";
import { useCountUp, useCardTilt, useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

const HEADLINE_LINES = ["Your startup raised.", "Now make it known."];

/** Four investor initials for the example card. Deliberately generic letters rather than invented
 * fund names — the card is an illustration of the format, and the moment it carries plausible
 * names it starts to read as a real round somebody could look up. */
const EXAMPLE_INVESTORS = ["EV", "AK", "NS", "RM"];

/** The opening. Everything here runs on `animate` (not `whileInView`) because it must play on
 * load, and it is choreographed rather than staggered as one block: eyebrow, then the headline
 * line by line out of its own mask, then the sub — while on the right the
 * announcement card scales up, its amount counts, its graph draws and its investors land one at a
 * time. The whole sequence is a shade over two seconds, which is long for a hero and deliberate:
 * the page is asking the reader to slow down and read a story, and the hero sets that pace.
 *
 * The headline masks are `overflow: hidden` wrappers with the line translated inside them —
 * transform only. Nothing on this page reveals with an animated `clip-path`: Motion silently drops
 * `clipPath` keyframes in some cases (see the press desk's ParallaxImage for the full account),
 * and a reveal that fails leaves content invisible rather than unanimated. */
/** The "Submit your funding round" / "See how it works" buttons that sat under the lede were
 * removed on request, along with the `onStart`/`onHowItWorks` props they called. The hero takes no
 * props now and links nowhere — the reader reaches the form by scrolling, which is the order the
 * sections were written in. */
export function FundingHero() {
  const reducedMotion = useReducedMotion();
  const { ref: amountRef, value: amountValue } = useCountUp(25, { durationMs: 1900, decimals: 1 });
  const { tilt, onPointerMove, onPointerLeave } = useCardTilt(2.5);

  const enter = (delay: number, y = 18) => ({
    initial: reducedMotion ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, delay, ease: FR_EASE },
  });

  return (
    <header className="fr-hero">
      <div className="fr-hero-glow" aria-hidden="true" />
      <div className="fr-container fr-hero-grid">
        <div className="fr-hero-copy">
          <h1 className="fr-hero-headline" aria-label={HEADLINE_LINES.join(" ")}>
            {HEADLINE_LINES.map((line, i) => (
              <span className="fr-hero-line-mask" key={line} aria-hidden="true">
                <motion.span
                  className={"fr-hero-line" + (i === 1 ? " fr-hero-line-accent" : "")}
                  initial={reducedMotion ? false : { y: "104%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.95, delay: 0.25 + i * 0.14, ease: FR_EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p className="fr-hero-sub" {...enter(0.62)}>
            Every funding round is more than a number. It is a signal of momentum, of conviction,
            and of what you intend to build next, told once and properly so founders, operators and
            investors can find it.
          </motion.p>

        </div>

        <div className="fr-hero-visual">
          <motion.div
            className="fr-hero-photo"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: FR_EASE }}
          >
            <Image src={fundingImages.hero.src} alt="" fill priority sizes="(max-width: 1000px) 100vw, 46vw" className="fr-img" />
          </motion.div>

          <motion.article
            className="fr-round-card"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.92, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
            transition={{ duration: 1, delay: 0.45, ease: FR_EASE }}
            aria-label="Example funding announcement card"
          >
            <p className="fr-round-flag">Example funding story · illustration only</p>

            <div className="fr-round-top">
              <span className="fr-round-badge">Series A</span>
              <span className="fr-round-year">2026</span>
            </div>

            <p className="fr-round-amount">
              <span className="fr-round-currency">₹</span>
              <span className="fr-round-figure" ref={amountRef}>
                {amountValue.toFixed(1)}
              </span>
              <span className="fr-round-unit">Cr</span>
            </p>
            <p className="fr-round-caption">Raised · example figure</p>

            <svg className="fr-round-graph" viewBox="0 0 260 78" role="presentation" focusable="false">
              <defs>
                <linearGradient id="fr-hero-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--fr-accent-soft)" />
                  <stop offset="100%" stopColor="var(--fr-accent)" />
                </linearGradient>
              </defs>
              <motion.path
                d="M4 70 L48 58 L92 62 L136 40 L180 44 L224 18 L256 8"
                fill="none"
                stroke="url(#fr-hero-line)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.9, ease: FR_EASE }}
              />
              {[
                [48, 58],
                [136, 40],
                [224, 18],
              ].map(([cx, cy], i) => (
                <motion.circle
                  key={cx}
                  cx={cx}
                  cy={cy}
                  r="3.4"
                  fill="var(--fr-accent)"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.5 + i * 0.14, ease: FR_EASE }}
                />
              ))}
            </svg>

            <div className="fr-round-foot">
              <div className="fr-round-lead">
                <p className="fr-round-lead-label">Led by</p>
                <p className="fr-round-lead-name">Example Ventures</p>
              </div>
              <div className="fr-round-investors" aria-hidden="true">
                {EXAMPLE_INVESTORS.map((initials, i) => (
                  <motion.span
                    key={initials}
                    className="fr-round-avatar"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.5, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 1.35 + i * 0.1, ease: FR_EASE }}
                  >
                    {initials}
                  </motion.span>
                ))}
                <span className="fr-round-plus">+3</span>
              </div>
            </div>
          </motion.article>

          {/* Two small satellites, so the card reads as one object in a composition rather than a
              rectangle floating alone. They drift on a long loop; reduced motion parks them. */}
          <motion.div
            className="fr-hero-chip fr-hero-chip-a"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.9 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: [0, -9, 0], scale: 1 }}
            transition={reducedMotion ? undefined : { opacity: { duration: 0.6, delay: 1.15 }, scale: { duration: 0.6, delay: 1.15 }, y: { duration: 7, delay: 1.6, repeat: Infinity, ease: "easeInOut" } }}
          >
            <span className="fr-chip-label">Runway</span>
            <span className="fr-chip-value">24 months</span>
          </motion.div>

          <motion.div
            className="fr-hero-chip fr-hero-chip-b"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, y: -12, scale: 0.9 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: [0, 8, 0], scale: 1 }}
            transition={reducedMotion ? undefined : { opacity: { duration: 0.6, delay: 1.3 }, scale: { duration: 0.6, delay: 1.3 }, y: { duration: 8.5, delay: 1.9, repeat: Infinity, ease: "easeInOut" } }}
          >
            <span className="fr-chip-label">Round</span>
            <span className="fr-chip-value">Priced equity</span>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
