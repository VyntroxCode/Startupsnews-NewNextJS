"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { SponsorFormCard } from "./SponsorFormCard";
import { useReducedMotion } from "./hooks";
import type { SponsorEventFormController } from "./useSponsorEventForm";

/** The submission — the last thing on the page, and the natural end of the story above it. A frame
 * around the existing wizard, never a replacement for it: fields, validation and the submit path
 * all live in useSponsorEventForm / validation.ts / steps, unchanged by the redesign. */
export function SponsorFormSection({
  ctrl,
  promotedCities,
}: {
  ctrl: SponsorEventFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-form-section" id="sp-form" aria-labelledby="sp-form-title">
      <span className="sp-form-glow" aria-hidden="true" />
      <div className="sp-wrap">
        {ctrl.submitted ? (
          <h2 id="sp-form-title" className="sp-sr-only">
            Event submission
          </h2>
        ) : (
          <SectionHead
            kicker="Submit your event"
            id="sp-form-title"
            title={
              <>
                Let&apos;s put your event <em>on the map.</em>
              </>
            }
            lede="Tell us what you're building, where it's happening and who it's for. Our team will review the details and help bring it to the StartupNews.fyi community."
          />
        )}

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <SponsorFormCard ctrl={ctrl} promotedCities={promotedCities} />
        </motion.div>
      </div>
    </section>
  );
}
