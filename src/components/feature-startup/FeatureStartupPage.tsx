"use client";

import { ImagePanel } from "./ImagePanel";
import { FormPanel } from "./FormPanel";
import { useFeatureStartupForm } from "./useFeatureStartupForm";

/** Split-screen shell: sliding captioned image on the left, animated 3-step form on the right.
 * The form controller is owned here (not inside FormPanel) so ImagePanel can stay in sync with
 * the active step without any signalling between the two siblings. */
export function FeatureStartupPage() {
  const ctrl = useFeatureStartupForm();
  return (
    <div className="fys-page">
      <div className="fys-shell-wrap">
        <div className="fys-shell">
          <ImagePanel currentStep={ctrl.currentStep} submitted={ctrl.submitted} />
          <FormPanel ctrl={ctrl} />
        </div>
      </div>
    </div>
  );
}
