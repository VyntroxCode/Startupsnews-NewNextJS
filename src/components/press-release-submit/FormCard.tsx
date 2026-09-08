"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { DetailsStep } from "./steps/DetailsStep";
import { ContactLocationStep } from "./steps/ContactLocationStep";
import { PitchDeckStep } from "./steps/PitchDeckStep";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";

/** Steps reveal vertically (up/down) instead of the left/right slide Feature Your Startup uses —
 * this page's own distinct transition feel. */
const STEP_SLIDE_SECONDS = 0.5;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

const stepVariants = {
  enter: (dir: number) => ({ y: `${dir * 26}px`, opacity: 0 }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      y: { duration: STEP_SLIDE_SECONDS, ease: EASE_OUT },
      opacity: { duration: STEP_SLIDE_SECONDS * 0.7, ease: EASE_OUT },
    },
  },
  exit: (dir: number) => ({
    y: `${dir * -18}px`,
    opacity: 0,
    transition: { duration: STEP_SLIDE_SECONDS * 0.5, ease: EASE_IN },
  }),
};

const reducedStepVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function FormCard({ ctrl }: { ctrl: LeadFormController }) {
  const { data, currentStep, direction, submitted } = ctrl;
  const reducedMotion = useReducedMotion();

  if (submitted) {
    return (
      <div className="pr-card pr-confirm">
        <div className="pr-confirm-mark">✓</div>
        <h2>On the record, {data.name.trim().split(" ")[0] || "there"}.</h2>
        <p>
          We&apos;ve received {data.companyName || "your"}&apos;s submission. Our editorial desk reviews
          every story and will follow up at {data.email || "the email you shared"} if it runs.
        </p>
        <Button variant="ghost" onClick={ctrl.reset}>
          Submit another story
        </Button>
      </div>
    );
  }

  return (
    <div className="pr-card">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="pr-step-viewport">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={reducedMotion ? reducedStepVariants : stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {currentStep === 1 && <DetailsStep ctrl={ctrl} />}
              {currentStep === 2 && <ContactLocationStep ctrl={ctrl} />}
              {currentStep === 3 && <PitchDeckStep ctrl={ctrl} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
