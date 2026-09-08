"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Growth", "Bridge", "Debt"];

const HEADLINE_WORDS = "Turn your funding round into the story everyone reads.".split(" ");

const wordMaskVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.15 } },
};

const wordVariants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Top-of-page hero for Submit Your Funding Round. Distinct from Advertise With Us's hero
 * (stacked plain-text lines that fade+slide in on scroll) — headline reveals word-by-word through
 * an overflow-hidden mask, and the stage list scrolls as an infinite marquee, rather than a static
 * list. Decorative orbs drift slowly instead of sitting still. */
export function FundingIntro() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="fr-intro">
      <div className="fr-intro-orb fr-intro-orb-a" aria-hidden="true" />
      <div className="fr-intro-orb fr-intro-orb-b" aria-hidden="true" />

      <div className="fr-intro-inner">
        <motion.p
          className="fr-intro-kicker"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          StartupNews.fyi — Funding Desk
        </motion.p>

        <motion.h1
          className="fr-intro-headline"
          initial="hidden"
          animate="show"
          variants={wordMaskVariants}
        >
          {HEADLINE_WORDS.map((word, i) => (
            <span className="fr-intro-word-mask" key={i}>
              <motion.span className="fr-intro-word" variants={wordVariants}>
                {word}&nbsp;
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          className="fr-intro-sub"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75 }}
        >
          Raised a round? Give our editorial desk the details — size, stage, investors — and get
          considered for coverage across StartupNews.fyi&apos;s global startup network.
        </motion.p>

        <motion.div
          className="fr-intro-ctas"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <a href="#fr-form" className="fr-intro-cta-primary">
            Submit Your Round
          </a>
          <Link href="/funding-tracker" className="fr-intro-cta-ghost">
            See Tracked Rounds
          </Link>
        </motion.div>
      </div>

      <div className="fr-stage-marquee" aria-hidden="true">
        <div className={"fr-stage-track" + (reducedMotion ? " fr-stage-track-static" : "")}>
          {[...STAGES, ...STAGES].map((stage, i) => (
            <span className="fr-stage-pill" key={i}>
              {stage}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
