"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { StepProgress } from "./StepProgress";
import { EventPreviewCard } from "./EventPreviewCard";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { EventDetailsStep } from "./steps/EventDetailsStep";
import { PosterContactStep } from "./steps/PosterContactStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useReducedMotion } from "./hooks";
import type { SponsorEventFormController } from "./useSponsorEventForm";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Steps slide + unblur in the direction of travel (forward enters from the right, back from the
 * left); the outgoing step leaves the other way first, so a step is never swapped instantly. */
const stepVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 56 : -56, filter: "blur(4px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE } },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -56 : 56,
    filter: "blur(4px)",
    transition: { duration: 0.24, ease: "easeIn" },
  }),
};

const reducedStepVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/** The wizard itself: progress indicator, the step card, and the live preview beside it — then,
 * after a successful submit, the confirmation in the same place.
 *
 * The mechanics are untouched: the same three step components against the same controller, the
 * same S3 poster upload, the same Turnstile gate and the same POST to /api/events/sponsor-event. */
export function SponsorFormCard({
  ctrl,
  promotedCities,
}: {
  ctrl: SponsorEventFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const { currentStep, direction, submitted, data } = ctrl;
  const reducedMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(currentStep);

  // Step one is long; after "Next" the new step would otherwise start above the fold. Only scroll
  // when the top of the card has actually gone off screen.
  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    const shell = shellRef.current;
    if (shell && shell.getBoundingClientRect().top < 0) {
      shell.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  }, [currentStep, reducedMotion]);

  return (
    <div ref={shellRef} className={"sp-form-shell" + (submitted ? " sp-form-shell-submitted" : "")}>
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="success"
            className="sp-card sp-card-success"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <SubmissionSuccess ctrl={ctrl} />
          </motion.div>
        ) : (
          <motion.div
            key="wizard"
            className="sp-form-wizard"
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, transition: { duration: 0.3 } }}
          >
            <div className="sp-form-main">
              <StepProgress currentStep={currentStep} />
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
              <p className="sp-form-privacy">We only use these details to review your event and get back to you.</p>
            </div>
            <aside className="sp-form-aside" aria-label="Live preview of your event">
              <EventPreviewCard data={data} />
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
