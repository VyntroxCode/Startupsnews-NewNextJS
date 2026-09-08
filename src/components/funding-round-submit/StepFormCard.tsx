"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { DetailsStep } from "./steps/DetailsStep";
import { ContactLocationStep } from "./steps/ContactLocationStep";
import { FundingDeckStep } from "./steps/FundingDeckStep";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";

/** The active step's real, upright, non-tilted fields — kept flat for usability even though the
 * hero above it fans out tilted "done"/"locked" cards. Fades + scales in on each step change,
 * its own distinct transition from Feature Your Startup's slide and Press Release's up/down. */
const cardVariants = {
  enter: { opacity: 0, scale: 0.96, y: 10 },
  center: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2 } },
};

const reducedCardVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function StepFormCard({ ctrl }: { ctrl: LeadFormController }) {
  const { data, currentStep, submitted } = ctrl;
  const reducedMotion = useReducedMotion();

  if (submitted) {
    return (
      <div className="fr-card fr-confirm">
        <div className="fr-confirm-mark">✓</div>
        <h2>Locked in, {data.name.trim().split(" ")[0] || "there"}.</h2>
        <p>
          We&apos;ve received {data.companyName || "your"}&apos;s funding round details. Our team
          reviews every submission and will follow up at {data.email || "the email you shared"}.
        </p>
        <Button variant="ghost" onClick={ctrl.reset}>
          Submit another round
        </Button>
      </div>
    );
  }

  return (
    <div className="fr-card">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="fr-step-viewport">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              variants={reducedMotion ? reducedCardVariants : cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {currentStep === 1 && <DetailsStep ctrl={ctrl} />}
              {currentStep === 2 && <ContactLocationStep ctrl={ctrl} />}
              {currentStep === 3 && <FundingDeckStep ctrl={ctrl} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
