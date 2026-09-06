"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ConfirmationPanel } from "./ConfirmationPanel";
import { PreviewCard } from "./PreviewCard";
import { WhatHappensNext } from "./WhatHappensNext";
import { WizardStepper } from "./WizardStepper";
import { formatConfirmDate } from "./format";
import { ContactStep } from "./steps/ContactStep";
import { DateVenueStep } from "./steps/DateVenueStep";
import { EventBasicsStep } from "./steps/EventBasicsStep";
import { ImagesStep } from "./steps/ImagesStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ONLINE_LOCATION_LABEL } from "./constants";
import { TOTAL_STEPS, useSubmitEventForm } from "./useSubmitEventForm";
import { isOnlineEvent, resolvedCity, resolvedCountry } from "./validation";

/** Slide duration in seconds. One constant so the incoming and outgoing halves stay in step. */
const STEP_SLIDE_SECONDS = 0.55;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

/** `x` is a percentage so the travel scales with the form's width instead of being a fixed nudge
 * that looks like a twitch on a wide screen. Negative direction (Back) enters from the left. */
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

export function SubmitEventForm({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
  const ctrl = useSubmitEventForm();
  const { data, currentStep, direction, submitted } = ctrl;
  const reducedMotion = useReducedMotion();

  if (submitted) {
    const whenText = `${formatConfirmDate(data.startDate)} · ${data.startTime || ""}`;
    const country = resolvedCountry(data);
    const whereText = isOnlineEvent(data)
      ? "Online (virtual)"
      : country === "India"
        ? resolvedCity(data) || "India"
        : country || "International";
    return (
      <ConfirmationPanel
        organizerFirstName={data.organizerName.trim().split(" ")[0] || ""}
        title={data.title}
        organizerEmail={data.organizerEmail}
        whenText={whenText}
        whereText={whereText}
        referenceId={`evt_${submitted.id}`}
        onSubmitAnother={ctrl.reset}
      />
    );
  }

  return (
    <div className="layout">
      <form onSubmit={(e) => e.preventDefault()}>
        <WizardStepper currentStep={currentStep} onNavigate={ctrl.goToStep} />
        {/* Clips the horizontal travel so a step entering from 45% off-frame never widens the
            document. `clip` rather than `hidden`, and only on x: unlike `hidden`, `clip` does not
            force the other axis to `auto`, so y stays `visible` and the country / city dropdowns
            can still open past the bottom of the step. */}
        <div className="step-viewport">
          {/* popLayout, not wait: the outgoing step leaves the layout immediately so the incoming
              one slides in at the same time rather than after it, and two steps of different
              heights don't fight over the container height mid-transition. */}
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={reducedMotion ? reducedStepVariants : stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {currentStep === 1 && <ContactStep ctrl={ctrl} />}
              {currentStep === 2 && <EventBasicsStep ctrl={ctrl} promotedCities={promotedCities} />}
              {currentStep === 3 && <DateVenueStep ctrl={ctrl} />}
              {currentStep === 4 && <ImagesStep ctrl={ctrl} />}
              {currentStep === 5 && <ReviewStep ctrl={ctrl} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </form>

      <div className="layout-sidebar">
        <PreviewCard
          title={data.title}
          image1={data.image1}
          country={isOnlineEvent(data) ? ONLINE_LOCATION_LABEL : resolvedCountry(data)}
          region={isOnlineEvent(data) ? "" : resolvedCity(data)}
          startDate={data.startDate}
          endDate={data.endDate || data.startDate}
        />
      </div>

      {/* Full width at the foot of the layout rather than stacked in the sidebar. activeIndex is
          still 0 — the whole form is one stage of the lifecycle — but stageProgress advances with
          each wizard step, so the line grows as the form is filled instead of only at submit. */}
      <WhatHappensNext activeIndex={0} stageProgress={(currentStep - 1) / TOTAL_STEPS} />
    </div>
  );
}
