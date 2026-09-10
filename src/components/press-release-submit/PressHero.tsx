"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { pressReleaseImages } from "./images";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

const HEADLINE_LINES = ["Your Story", "Starts Here."];

/** The opening choreography, in seconds. The brief asks for a 2–3 second sequence that the page
 * performs on itself rather than a loading screen, with each beat landing after the last so the
 * reader's eye is led rather than ambushed:
 *
 *   0.00  the gray ground is simply there (no animation — it is the page background)
 *   0.30  the masthead label fades in
 *   0.50  the headline reveals line by line from under a clip
 *   1.00  the supporting paragraph rises
 *   1.30  the photograph opens from a bottom mask while settling from 1.06 → 1
 *   1.80  the pink marker draws across the composition
 *   2.20  the editorial card and its metadata stagger in
 *   2.45  the actions and the scroll cue appear last
 *
 * Everything here is `animate` (not `whileInView`) because it must run on load; every section
 * below the fold uses `whileInView` instead. */
const T = {
  masthead: 0.3,
  headline: 0.5,
  sub: 1.0,
  image: 1.3,
  marker: 1.8,
  card: 2.2,
  actions: 2.45,
} as const;

export function PressHero({ onStart, onHowItWorks }: { onStart: () => void; onHowItWorks: () => void }) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const cueOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "-9%"]);

  const enter = (delay: number, y = 24) =>
    reducedMotion
      ? { initial: false as const, animate: {} }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: PR_EASE },
        };

  return (
    <header className="pr-hero" ref={sectionRef}>
      <div className="pr-hero-grid">
        <div className="pr-hero-copy">
          <motion.p className="pr-hero-masthead" {...enter(T.masthead, 12)}>
            <span className="pr-hero-dot" aria-hidden="true" />
            StartupNews.fyi <span className="pr-hero-slash">/</span> Press Desk
          </motion.p>

          <h1 className="pr-hero-headline" aria-label={HEADLINE_LINES.join(" ")}>
            {HEADLINE_LINES.map((line, i) => (
              <span className="pr-hero-line-clip" key={line} aria-hidden="true">
                <motion.span
                  className="pr-hero-line"
                  initial={reducedMotion ? false : { y: "108%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.85, delay: T.headline + i * 0.13, ease: PR_EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p className="pr-hero-sub" {...enter(T.sub, 18)}>
            Submit your press release, announcement, launch, company milestone, or story for
            editorial review — and give our desk the context, people and material needed to
            understand what happened, and why it matters.
          </motion.p>

          <motion.div className="pr-hero-actions" {...enter(T.actions, 16)}>
            <button type="button" className="pr-btn pr-btn-primary" onClick={onStart}>
              Submit Your Story
              <span className="pr-btn-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="pr-btn pr-btn-ghost" onClick={onHowItWorks}>
              See How It Works
            </button>
          </motion.div>
        </div>

        <div className="pr-hero-visual">
          <motion.div
            className="pr-hero-frame"
            initial={reducedMotion ? false : { clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.1, delay: T.image, ease: PR_EASE }}
          >
            <motion.div
              className="pr-hero-frame-inner"
              initial={reducedMotion ? false : { scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.4, delay: T.image, ease: PR_EASE }}
              style={reducedMotion ? undefined : { y: imageY }}
            >
              <Image
                src={pressReleaseImages.hero.src}
                alt={pressReleaseImages.hero.alt}
                fill
                sizes="(max-width: 900px) 100vw, 46vw"
                priority
                className="pr-figure-img"
              />
            </motion.div>
            <span className="pr-hero-grain" aria-hidden="true" />
          </motion.div>

          {/* Illustrative editorial card — a label for the kinds of story this desk takes, not a
              published or in-review submission. */}
          <motion.div
            className="pr-hero-card"
            initial={reducedMotion ? false : { opacity: 0, y: 26, x: -10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.75, delay: T.card, ease: PR_EASE }}
          >
            <p className="pr-hero-card-kicker">Press Desk</p>
            <p className="pr-hero-card-title">The Story</p>
            <ul className="pr-hero-card-list">
              {["Startup announcement", "Company milestone", "Product launch"].map((item, i) => (
                <motion.li
                  key={item}
                  initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: T.card + 0.15 + i * 0.08, ease: PR_EASE }}
                >
                  {item}
                </motion.li>
              ))}
            </ul>
            <p className="pr-hero-card-foot">Illustrative — not a published story</p>
          </motion.div>

          <motion.span
            className="pr-hero-marker"
            aria-hidden="true"
            initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: T.marker, ease: PR_EASE }}
          />
          <motion.span className="pr-hero-folio" aria-hidden="true" {...enter(T.marker + 0.2, 10)}>
            01
          </motion.span>
        </div>
      </div>

      {/* Two elements, not one: the scroll-linked fade lives on the wrapper and the entrance fade
          on the button, because a MotionValue passed through `style` and an `animate` target
          cannot both drive `opacity` on the same element — the scroll value would simply win and
          the entrance would never be seen. */}
      <motion.div className="pr-scroll-cue-wrap" style={reducedMotion ? undefined : { opacity: cueOpacity }}>
        <motion.button
          type="button"
          className="pr-scroll-cue"
          onClick={onHowItWorks}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: T.actions + 0.15 }}
        >
          <span>Scroll to read</span>
          <span className="pr-scroll-track" aria-hidden="true">
            <motion.span
              className="pr-scroll-thumb"
              animate={reducedMotion ? {} : { y: ["-100%", "150%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </motion.button>
      </motion.div>
    </header>
  );
}
