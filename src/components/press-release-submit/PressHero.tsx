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
 *   0.50  the headline reveals line by line from under a clip
 *   1.00  the supporting paragraph rises
 *   1.30  the photograph opens from a bottom mask while settling from 1.06 → 1
 *   2.20  the editorial card and its metadata stagger in
 *
 * The pink marker that drew across the top of the photograph at 1.80s was removed on request,
 * along with its `marker` timing.
 *
 * Removed on request: the "StartupNews.fyi / Press Desk" masthead that opened the sequence, the
 * two buttons under the paragraph, and the "Scroll to read" cue that closed it — with them went
 * the `onStart`/`onHowItWorks` props, so the hero takes none and links nowhere. The `masthead` and
 * `actions` timings went with their elements; the beats that remain keep their original times
 * rather than being packed up, since the point of the sequence is the pacing, not the count.
 *
 * Everything here is `animate` (not `whileInView`) because it must run on load; every section
 * below the fold uses `whileInView` instead. */
const T = {
  headline: 0.5,
  sub: 1.0,
  image: 1.3,
  card: 2.2,
} as const;

export function PressHero() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
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

        </div>
      </div>
    </header>
  );
}
