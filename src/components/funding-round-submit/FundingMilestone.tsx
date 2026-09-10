"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUp, FR_VIEWPORT } from "./motion";

const META_ROWS: Array<[string, string]> = [
  ["Reviewed by", "Our editorial desk"],
  ["Turnaround", "Usually within a few days"],
  ["Reach", "StartupNews.fyi's global network"],
];

/** Editorial transition between the hero and the form itself — a large italic serif statement on
 * the left, a short explanation plus quiet metadata on the right. Asymmetric on purpose, the same
 * "big typography opposite small supporting copy" composition the hero and closing section use. */
export function FundingMilestone() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fr-milestone">
      <div className="fr-container fr-milestone-inner">
        <motion.p
          className="fr-milestone-statement"
          initial={reducedMotion ? false : "hidden"}
          whileInView="show"
          viewport={FR_VIEWPORT}
          variants={fadeUp}
        >
          Every funding round tells a story.
        </motion.p>

        <div>
          <motion.div
            initial={reducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={FR_VIEWPORT}
            variants={fadeUp}
            className="fr-milestone-copy"
          >
            <p>
              This submission captures your company&apos;s milestone in your own words, then hands
              it to our editorial desk — who review the details and consider it for coverage
              across StartupNews.fyi.
            </p>
          </motion.div>

          <motion.div
            className="fr-milestone-meta"
            initial={reducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={FR_VIEWPORT}
            variants={fadeUp}
          >
            {META_ROWS.map(([label, value]) => (
              <div className="fr-milestone-meta-row" key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
