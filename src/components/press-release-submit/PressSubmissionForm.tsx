"use client";

import { AnimatePresence, motion } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { PressProgress } from "./PressProgress";
import { PressSuccess } from "./PressSuccess";
import { StoryStep } from "./steps/StoryStep";
import { SourceStep } from "./steps/SourceStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { useReducedMotion } from "./hooks";
import { PR_EASE, PR_EASE_IN } from "./motion";

/** Steps slide laterally in the direction of travel — forward enters from the right and leaves to
 * the left, back does the reverse — which is the one piece of motion on this page that carries
 * information rather than decoration. 0.7s, matching the brief's 600–800ms band. */
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 30 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.7, ease: PR_EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -30, transition: { duration: 0.35, ease: PR_EASE_IN } }),
};

const reducedStepVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/** Section 10 — the submission itself, and the last chapter of the page.
 *
 * Three visual steps over the six fields the shared `useLeadForm` controller has always had: The
 * Story (canonical validation steps 1 + 4: company, name, phone, email), The Source (canonical
 * step 5: website, plus the optional location), then a Review read-back that
 * adds no fields at all. No new fields are invented here, and there is no file input of any kind —
 * the page asks for no PDF anywhere, by design.
 *
 * `mode="wait"` on the AnimatePresence matters: the outgoing step must finish leaving before the
 * incoming one arrives, or two absolutely-positioned steps of different heights fight over the
 * card's height mid-transition. Field values live in the controller above this component, so they
 * survive every step change and every re-render of the story sections above. */
export function PressSubmissionForm({
  ctrl,
  promotedCities,
}: {
  ctrl: LeadFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const reducedMotion = useReducedMotion();
  const { currentStep, direction, submitted } = ctrl;

  return (
    <section className="pr-section pr-form-section" id="pr-form" aria-labelledby="pr-form-title">
      <SectionIntro
        label="Your Submission"
        heading={
          <>
            Tell us <em>what happened</em>.
          </>
        }
        headingId="pr-form-title"
        lede={
          <>
            Six details, three short steps. <em>A person on our editorial team reads every
            submission</em> that comes through this desk.
          </>
        }
      />

      <div className={"pr-form-shell" + (submitted ? " is-done" : "")}>
        {!submitted && <PressProgress currentStep={currentStep} />}

        <div className="pr-card">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            {submitted ? (
              <motion.div
                key="success"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <PressSuccess ctrl={ctrl} />
              </motion.div>
            ) : (
              <motion.form
                key={currentStep}
                custom={direction}
                variants={reducedMotion ? reducedStepVariants : stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={(e) => e.preventDefault()}
              >
                {currentStep === 1 && <StoryStep ctrl={ctrl} />}
                {currentStep === 2 && <SourceStep ctrl={ctrl} promotedCities={promotedCities} />}
                {currentStep === 3 && <ReviewStep ctrl={ctrl} />}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
