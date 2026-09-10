"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDownIcon } from "./icons";
import { FR_EASE } from "./motion";

const HEADLINE_LINES = ["Your funding round,", "told like it matters."];

const BAR_HEIGHTS = [38, 62, 48, 84, 66];

/** Top-of-page cinematic hero. Asymmetric two-column composition — large serif headline
 * revealing line-by-line through an overflow-hidden mask on the left, an abstract editorial
 * "growth" visual (ascending bars, thin orbit rings, an oversized ghost numeral) on the right
 * instead of a stock photo of people shaking hands. */
export function FundingHero({ onStart }: { onStart: () => void }) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="fr-hero">
      <div className="fr-container fr-hero-inner">
        <div>
          <motion.p
            className="fr-eyebrow"
            initial={reducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Funding Round · StartupNews.fyi
          </motion.p>

          <h1 className="fr-hero-heading">
            {HEADLINE_LINES.map((line, i) => (
              <span className="fr-hero-line" key={line}>
                <motion.span
                  className="fr-hero-line-inner"
                  initial={reducedMotion ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1, ease: FR_EASE, delay: 0.25 + i * 0.14 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="fr-hero-sub"
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
          >
            Share your latest round with the StartupNews.fyi ecosystem — the size, the stage, and
            the people behind it — and put your milestone in front of founders, investors, and the
            startup community who read us.
          </motion.p>

          <motion.button
            type="button"
            className="fr-hero-cta"
            onClick={onStart}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            Start Submission
            <ArrowDownIcon width={14} height={14} />
          </motion.button>
        </div>

        <motion.div
          className="fr-hero-visual"
          initial={reducedMotion ? false : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: FR_EASE, delay: 0.3 }}
          aria-hidden="true"
        >
          <span className="fr-hero-visual-num">26</span>

          <div className="fr-hero-visual-meta">
            <span>Funding Desk</span>
            <span>2026</span>
          </div>

          <span className="fr-hero-visual-ring" style={{ width: 220, height: 220, top: "8%", right: "-8%" }} />
          <span className="fr-hero-visual-ring" style={{ width: 130, height: 130, top: "18%", right: "2%" }} />

          <div className="fr-hero-visual-chart">
            {BAR_HEIGHTS.map((h, i) => (
              <motion.span
                key={i}
                className="fr-hero-visual-bar"
                style={{ height: `${h}%` }}
                initial={reducedMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.9, ease: FR_EASE, delay: 0.9 + i * 0.08 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
