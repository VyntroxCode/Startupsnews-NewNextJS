"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { fundingImages } from "./images";
import { CapitalIcon, ConvictionIcon, ExpansionIcon, GrowthIcon, MomentumIcon } from "./icons";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

const FACETS = [
  {
    key: "capital",
    title: "Capital",
    body: "The money is the fact of the round: how much, from whom, on what terms you are willing to say.",
    Icon: CapitalIcon,
  },
  {
    key: "conviction",
    title: "Conviction",
    body: "Someone looked at the same market you did and decided you were the team to build it.",
    Icon: ConvictionIcon,
  },
  {
    key: "growth",
    title: "Growth",
    body: "What the round is actually for: the hires, the product, the ground you could not cover before.",
    Icon: GrowthIcon,
  },
  {
    key: "expansion",
    title: "Expansion",
    body: "New cities, new segments, new categories: the map of where this company goes next.",
    Icon: ExpansionIcon,
  },
  {
    key: "momentum",
    title: "Momentum",
    body: "A round read alongside the last one is a trajectory, and a trajectory is what people remember.",
    Icon: MomentumIcon,
  },
];

/** Section 01 — the argument of the page, made as five facets of a single announcement.
 *
 * Motion language: *lateral deal*. The cards arrive from the left one after another rather than
 * rising, so this section moves sideways where the hero moved up — and the photograph now travels
 * in from the right to meet them, which reads as one movement across the section rather than two
 * unrelated ones. (It used to settle out of an over-scale; the slide replaced that on request. The
 * scale went with it rather than being layered underneath — an over-scale and a lateral travel at
 * once is two ideas competing over the same second.) The first card is deliberately double-width
 * and carries the photograph's caption weight, which stops the row reading as a five-across
 * feature grid. */
export function FundingStory() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="fr-section fr-story" aria-labelledby="fr-story-title">
      <div className="fr-container">
        <div className="fr-story-grid">
          <div className="fr-story-copy">
            <SectionHead
              label="Why it matters"
              heading={
                <>
                  Every funding round tells a <em>bigger story</em>.
                </>
              }
              headingId="fr-story-title"
              lede={
                <>
                  A funding announcement is <em>not only about how much was raised</em>. It is about
                  the founders behind it, the investors who backed the thesis, the market being
                  built, and what happens next.
                </>
              }
            />
          </div>

          {/* Slow on purpose — 1.15s over 88px is a drift, not a slide. `.fr-story-grid` clips,
              so the travel never pushes the figure past the viewport edge on the way in. */}
          <motion.figure
            className="fr-story-figure"
            initial={reducedMotion ? false : { opacity: 0, x: 88 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.15, ease: FR_EASE }}
          >
            <Image
              src={fundingImages.story.src}
              alt={fundingImages.story.alt}
              fill
              sizes="(max-width: 1000px) 100vw, 42vw"
              className="fr-img"
            />
          </motion.figure>
        </div>

        <ul className="fr-facets">
          {FACETS.map((facet, i) => (
            <motion.li
              className="fr-facet"
              key={facet.key}
              initial={reducedMotion ? false : { opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              whileHover={reducedMotion ? undefined : { y: -6 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: FR_EASE }}
            >
              <span className="fr-facet-mark" aria-hidden="true">
                <facet.Icon />
              </span>
              <h3 className="fr-facet-title">{facet.title}</h3>
              <p className="fr-facet-body">{facet.body}</p>
              <span className="fr-facet-glow" aria-hidden="true" />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
