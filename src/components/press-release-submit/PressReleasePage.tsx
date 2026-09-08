"use client";

import { useLeadForm } from "@/components/lead-forms/shared/useLeadForm";
import { ImagePanel } from "./ImagePanel";
import { StepTabs } from "./StepTabs";
import { FormCard } from "./FormCard";

/** Split-screen layout: an inset photo card + typewriter headline on the left, step tabs + form
 * card on the right — sharing only the step/validation mechanics (useLeadForm) with Feature Your
 * Startup, not its visual design (full-bleed dark photo + Ken-Burns crossfade there vs. this
 * light inset card with a rotate-and-settle swap, checkmark pill tabs here vs. the segmented bar
 * there, up/down step reveal here vs. left/right slide there). */
export function PressReleasePage() {
  const ctrl = useLeadForm("press-release");
  return (
    <div className="pr-page">
      <div className="pr-shell-wrap">
        <div className="pr-shell">
          <ImagePanel currentStep={ctrl.currentStep} submitted={ctrl.submitted} />
          <div className="pr-form-col">
            <StepTabs currentStep={ctrl.currentStep} />
            <FormCard ctrl={ctrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
