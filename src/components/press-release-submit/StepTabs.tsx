"use client";

import { LEAD_FORM_TOTAL_STEPS } from "@/components/lead-forms/shared/useLeadForm";

const STEP_LABELS = ["Details", "Contact", "Press Kit"];

/** Pill-shaped step tabs for the Press Release page's masthead. A completed step shows a
 * checkmark instead of its number — the site-wide request that finished steps read as "done" at a
 * glance rather than just changing color. */
export function StepTabs({ currentStep }: { currentStep: number }) {
  return (
    <div className="pr-step-tabs" role="progressbar" aria-valuemin={1} aria-valuemax={LEAD_FORM_TOTAL_STEPS} aria-valuenow={currentStep}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const state = step < currentStep ? "done" : step === currentStep ? "active" : "pending";
        return (
          <div key={label} className="pr-step-tab" data-state={state}>
            <span className="pr-step-tab-mark">{state === "done" ? "✓" : step}</span>
            <span className="pr-step-tab-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
