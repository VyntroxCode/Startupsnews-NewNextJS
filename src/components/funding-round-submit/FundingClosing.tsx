"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon } from "./icons";
import { fadeUp, fadeUpSmall, FR_VIEWPORT } from "./motion";

/** Final full-bleed CTA before the site's own global footer — a second on-ramp back to the
 * wizard for anyone who scrolled all the way down reading rather than filling fields as they
 * went. */
export function FundingClosing({ onStart, submitted }: { onStart: () => void; submitted: boolean }) {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fr-closing">
      <div className="fr-container">
        <motion.p
          className="fr-closing-statement"
          initial={reducedMotion ? false : "hidden"}
          whileInView="show"
          viewport={FR_VIEWPORT}
          variants={fadeUp}
        >
          Raised a round worth knowing about?
        </motion.p>
        <motion.p
          className="fr-closing-copy"
          initial={reducedMotion ? false : "hidden"}
          whileInView="show"
          viewport={FR_VIEWPORT}
          variants={fadeUpSmall}
        >
          Share your next milestone with the StartupNews.fyi community — it takes a few minutes.
        </motion.p>
        {!submitted && (
          <motion.div
            initial={reducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={FR_VIEWPORT}
            variants={fadeUpSmall}
          >
            <Button variant="primary" onClick={onStart}>
              Submit Your Funding Round
              <ArrowRightIcon width={15} height={15} />
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
