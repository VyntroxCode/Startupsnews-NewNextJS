"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { SponsorFormCard } from "./SponsorFormCard";
import { useReducedMotion } from "./hooks";
import type { SponsorEventFormController } from "./useSponsorEventForm";

/** 14 — the submission, and the last thing on the page. Everything above it exists so that by the
 * time someone reaches this section they already know what they're applying for.
 *
 * This is a frame around the existing wizard, not a replacement for it: SponsorFormCard still
 * renders the same four steps against the same controller, still uploads the poster to S3, still
 * gates submission on Turnstile, and still POSTs to /api/events/sponsor-event. Nothing about the
 * fields, validation or submission path changed with the redesign. */
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
      <div className="sp-wrap">
        {!ctrl.submitted && (
          <SectionHead
            kicker="Submit"
            title={<span id="sp-form-title">Tell Us About Your Event.</span>}
            lede="Four short steps: the event itself, when it happens, how it looks and who to talk to. Our team reads every submission."
          />
        )}

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <SponsorFormCard ctrl={ctrl} promotedCities={promotedCities} />
        </motion.div>
      </div>
    </section>
  );
}
