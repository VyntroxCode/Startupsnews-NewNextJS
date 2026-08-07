"use client";

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
import { useSubmitEventForm } from "./useSubmitEventForm";
import { resolvedCity } from "./validation";

export function SubmitEventForm() {
  const ctrl = useSubmitEventForm();
  const { data, currentStep, submitted } = ctrl;

  if (submitted) {
    const whenText = `${formatConfirmDate(data.startDate)} · ${data.startTime || ""}`;
    const whereText = data.country === "India" ? resolvedCity(data) || "India" : data.country || "International";
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
        {currentStep === 1 && <ContactStep ctrl={ctrl} />}
        {currentStep === 2 && <EventBasicsStep ctrl={ctrl} />}
        {currentStep === 3 && <DateVenueStep ctrl={ctrl} />}
        {currentStep === 4 && <ImagesStep ctrl={ctrl} />}
        {currentStep === 5 && <ReviewStep ctrl={ctrl} />}
      </form>

      <div className="layout-sidebar">
        <PreviewCard
          title={data.title}
          image1={data.image1}
          country={data.country}
          region={resolvedCity(data)}
          startDate={data.startDate}
          endDate={data.endDate || data.startDate}
        />
        <WhatHappensNext activeIndex={0} />
      </div>
    </div>
  );
}
