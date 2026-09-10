"use client";

import { motion } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** Section 03 — what a submission looks like once it is on the desk, drawn as a small stack of
 * paper rather than described in prose: a review slip on top, two sheets fanned behind it, a pink
 * sticky note, and the desk's own markings.
 *
 * Motion language: *layered card assembly*. The sheets slide into position one at a time and the
 * top card settles last, so the stack builds itself the way a physical one would. Every value on
 * the slip is a placeholder — see the caption, which stays visible rather than being decoration.
 *
 * Every rotation is part of the Motion target rather than a CSS `transform` on the same element:
 * Motion writes the whole `transform` property, so a static CSS rotate on an element it animates
 * would be thrown away the instant the entrance ran. */
export function EditorialDesk() {
  const reducedMotion = useReducedMotion();

  const sheet = (delay: number, rotate = 0) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 34, rotate: 0 },
    whileInView: { opacity: 1, y: 0, rotate },
    viewport: { once: true, amount: 0.4 },
    transition: { duration: 0.7, delay, ease: PR_EASE },
  });

  return (
    <section className="pr-section pr-desk" aria-labelledby="pr-desk-title">
      <div className="pr-desk-grid">
        <SectionIntro
          index="03"
          label="The Desk"
          heading="Where a submission lands."
          headingId="pr-desk-title"
          lede="Every release arrives as a slip on an editor's desk: the headline, who it came from, the context around it, and a status that stays open until a person has read it."
        />

        <div className="pr-desk-stack" role="img" aria-label="Illustration of a submission on an editorial desk, showing an example review slip">
          <motion.div className="pr-desk-sheet pr-desk-sheet-c" {...sheet(0, -4.5)} aria-hidden="true" />
          <motion.div className="pr-desk-sheet pr-desk-sheet-b" {...sheet(0.12, 3.5)} aria-hidden="true" />

          <motion.div className="pr-desk-card" {...sheet(0.26)} aria-hidden="true">
            <div className="pr-desk-card-head">
              <span className="pr-desk-card-kicker">Editorial Review</span>
              <span className="pr-desk-card-folio">/ 001</span>
            </div>
            <dl className="pr-desk-card-rows">
              <div>
                <dt>Headline</dt>
                <dd>[ Example announcement ]</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>[ Company / Founder ]</dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>[ Supporting information ]</dd>
              </div>
            </dl>
            <div className="pr-desk-card-status">
              <span className="pr-desk-status-dot" />
              Under review
            </div>
          </motion.div>

          <motion.div
            className="pr-desk-note"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 16, rotate: 0 }}
            whileInView={{ opacity: 1, scale: 1, y: 0, rotate: -3 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: 0.5, ease: PR_EASE }}
          >
            Needs a source link
          </motion.div>

          <motion.span
            className="pr-desk-marker"
            aria-hidden="true"
            initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.62, ease: PR_EASE }}
          />
        </div>
      </div>
      <p className="pr-caption pr-desk-caption">Illustrative example — not a real submission under review.</p>
    </section>
  );
}
