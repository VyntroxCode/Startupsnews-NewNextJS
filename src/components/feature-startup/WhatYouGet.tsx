"use client";

import { motion } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import {
  ArrowRightIcon,
  BadgeIcon,
  NetworkIcon,
  SearchIcon,
  ShareIcon,
  SpotlightIcon,
  StoryIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";

/** Deliberately phrased as what a feature *does* — discovery, credibility, a searchable page, a
 * shareable asset — never as an outcome we can't control. No claims about funding raised,
 * investor intros, or guaranteed press pickup appear anywhere on this page. */
const BENEFITS = [
  {
    n: "01",
    Icon: SpotlightIcon,
    title: "Discovery",
    body: "Get in front of readers who open StartupNews.fyi specifically to find out what's being built right now.",
  },
  {
    n: "02",
    Icon: BadgeIcon,
    title: "Credibility",
    body: "An editorial feature written up by our news desk reads very differently to an ad — it's coverage, not a placement.",
  },
  {
    n: "03",
    Icon: SearchIcon,
    title: "Visibility",
    body: "A published page on a news domain that's indexed and searchable long after the day it goes live.",
  },
  {
    n: "04",
    Icon: ShareIcon,
    title: "Social exposure",
    body: "A feature you can hand to your team, your investors, and your own channels — something worth sharing.",
  },
  {
    n: "05",
    Icon: NetworkIcon,
    title: "Network effect",
    body: "More surface area for founders, investors, media, and operators to run into your company by accident.",
  },
  {
    n: "06",
    Icon: StoryIcon,
    title: "Storytelling",
    body: "Room to say what you're building, why it matters, and where you're taking it — not just a one-line listing.",
  },
] as const;

/** Section 04 — the benefits grid. Motion language: *card stagger + hover lift*. Cards arrive in
 * reading order on a short delay ramp, then everything else lives in the hover state (lift, border
 * ignition, arrow slide) rather than in more scroll animation, so this section feels tactile where
 * the one above it felt typographic. */
export function WhatYouGet() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fys-benefits" aria-labelledby="fys-benefits-title">
      <SectionLabel index="02">Exposure</SectionLabel>
      <motion.h2
        id="fys-benefits-title"
        className="fys-h2"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        What happens when your startup gets featured?
      </motion.h2>

      <div className="fys-benefit-grid">
        {BENEFITS.map((benefit, i) => (
          <motion.article
            key={benefit.n}
            className="fys-benefit-card"
            initial={reducedMotion ? false : { opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="fys-benefit-n">{benefit.n}</span>
            <span className="fys-benefit-icon">
              <benefit.Icon />
            </span>
            <h3>{benefit.title}</h3>
            <p>{benefit.body}</p>
            <ArrowRightIcon className="fys-benefit-arrow" />
          </motion.article>
        ))}
      </div>
    </section>
  );
}
