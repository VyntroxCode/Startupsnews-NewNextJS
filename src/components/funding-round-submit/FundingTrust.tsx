"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUp, fadeUpSmall, FR_VIEWPORT } from "./motion";

const REASONS = [
  {
    label: "Reach",
    title: "10M+ Monthly Readers",
    body: "Put your round in front of the founders, investors, and operators who actually read us.",
  },
  {
    label: "Speed",
    title: "Fast Editorial Turnaround",
    body: "Our news desk reviews every submission quickly, so a timely round gets timely coverage.",
  },
  {
    label: "Trust",
    title: "A Media Brand Investors Know",
    body: "Join the founders already covered across StartupNews.fyi's global startup network.",
  },
  {
    label: "Distribution",
    title: "Built-in Amplification",
    body: "Coverage reaches our newsletter, social channels, and partner network automatically.",
  },
];

/** Quiet, monochrome trust strip ahead of the closing CTA — no cursor-tilt cards, no color per
 * card, just a thin-bordered grid so it reads as restrained editorial credibility rather than a
 * SaaS "why choose us" section. */
export function FundingTrust() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fr-trust">
      <div className="fr-container">
        <div className="fr-trust-head">
          <motion.p
            className="fr-eyebrow"
            initial={reducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={FR_VIEWPORT}
            variants={fadeUpSmall}
          >
            Why Founders Submit Here
          </motion.p>
          <motion.h2
            initial={reducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={FR_VIEWPORT}
            variants={fadeUp}
          >
            Coverage that carries weight.
          </motion.h2>
        </div>

        <div className="fr-trust-grid">
          {REASONS.map((reason, i) => (
            <motion.div
              key={reason.title}
              className="fr-trust-card"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={FR_VIEWPORT}
              transition={{ duration: 0.55, delay: reducedMotion ? 0 : i * 0.08 }}
            >
              <span className="fr-trust-card-label">{reason.label}</span>
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
