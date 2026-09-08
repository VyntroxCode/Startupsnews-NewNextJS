"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { DetailsStep } from "./steps/DetailsStep";
import { ContactLocationStep } from "./steps/ContactLocationStep";
import { PitchDeckStep } from "./steps/PitchDeckStep";
import { TOTAL_STEPS, type FeatureStartupFormController } from "./useFeatureStartupForm";

/** Same slide timing/easing as the site's other animated wizard (submit-event's SubmitEventForm)
 * so the two multi-step forms feel like one design language. */
const STEP_SLIDE_SECONDS = 0.55;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

const stepVariants = {
  enter: (dir: number) => ({ x: `${dir * 45}%`, opacity: 0 }),
  center: {
    x: "0%",
    opacity: 1,
    transition: {
      x: { duration: STEP_SLIDE_SECONDS, ease: EASE_OUT },
      opacity: { duration: STEP_SLIDE_SECONDS * 0.6, ease: EASE_OUT },
    },
  },
  exit: (dir: number) => ({
    x: `${dir * -30}%`,
    opacity: 0,
    transition: { duration: STEP_SLIDE_SECONDS * 0.55, ease: EASE_IN },
  }),
};

const reducedStepVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const STEP_LABELS = ["Your Details", "Contact & Location", "Pitch Deck"];

export function FormPanel({ ctrl }: { ctrl: FeatureStartupFormController }) {
  const { data, currentStep, direction, submitted } = ctrl;
  const reducedMotion = useReducedMotion();

  if (submitted) {
    return (
      <div className="fys-form-col">
        <div className="fys-form-inner fys-confirm">
          <div className="fys-confirm-mark">✓</div>
          <h2>Thanks, {data.name.trim().split(" ")[0] || "there"}!</h2>
          <p>
            We&apos;ve received {data.companyName || "your startup"}&apos;s details. Our editorial team
            reviews every submission and will reach out at {data.email || "the email you shared"} if
            it&apos;s a fit.
          </p>
          <Button variant="ghost" onClick={ctrl.reset}>
            Submit another startup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fys-form-col">
      <div className="fys-form-inner">
        <p className="fys-eyebrow">Feature Your Startup</p>
        <h1 className="fys-heading">Get in Front of Founders, Investors, and Operators.</h1>
        <p className="fys-subheading">
          Share your startup&apos;s story and we&apos;ll consider it for coverage on StartupNews.fyi.
        </p>

        <div
          className="fys-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={currentStep}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <span
              key={step}
              className={
                "fys-progress-seg" + (step < currentStep ? " done" : step === currentStep ? " active" : "")
              }
            >
              <i />
            </span>
          ))}
        </div>
        <p className="fys-progress-label">
          Step {currentStep} of {TOTAL_STEPS} — {STEP_LABELS[currentStep - 1]}
        </p>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="fys-step-viewport">
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
    </div>
  );
}
