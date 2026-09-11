"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { EventTimeline } from "./EventTimeline";
import { EventPreviewCard } from "./EventPreviewCard";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { EventDetailsStep } from "./steps/EventDetailsStep";
import { PosterContactStep } from "./steps/PosterContactStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { SponsorEventFormController } from "./useSponsorEventForm";

/** Slides + fades in the direction of travel (forward = enters from the right, back = enters
 * from the left) — a different feel from Funding Round's scale-in, so each of the site's
 * multi-step forms reads as its own page rather than a reskin of the others. */
const stepVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -48 : 48, transition: { duration: 0.25, ease: "easeIn" } }),
};

const reducedStepVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function SponsorFormCard({
  ctrl,
  promotedCities,
}: {
  ctrl: SponsorEventFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const { currentStep, direction, submitted, data } = ctrl;
  const reducedMotion = useReducedMotion();

  if (submitted) {
    return (
      <div className="sp-form-shell sp-form-shell-submitted">
        <SubmissionSuccess ctrl={ctrl} />
      </div>
    );
  }

  return (
    <div className="sp-form-shell">
      <EventTimeline currentStep={currentStep} />
      <div className="sp-card">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="sp-step-viewport">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={reducedMotion ? reducedStepVariants : stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {currentStep === 1 && <EventDetailsStep ctrl={ctrl} promotedCities={promotedCities} />}
                {currentStep === 2 && <PosterContactStep ctrl={ctrl} />}
                {currentStep === 3 && <ReviewStep ctrl={ctrl} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </form>
      </div>
      <EventPreviewCard data={data} />
    </div>
  );
}
