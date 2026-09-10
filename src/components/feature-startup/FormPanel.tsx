"use client";

import { DetailsContactStep } from "./steps/DetailsContactStep";
import type { FeatureStartupFormController } from "./useFeatureStartupForm";

/** The right-hand column of the submission card.
 *
 * This was a two-page wizard until the pitch-deck upload was dropped; with the document gone the
 * second page had nothing left on it, so the progress rail and the sliding step viewport went with
 * it and the remaining fields are simply asked for on one page. The controller is unchanged — it
 * is still the shared `useLeadForm` instance, with the same field set, the same validators and the
 * same submit path; it just runs with a single step group now. */
export function FormPanel({ ctrl }: { ctrl: FeatureStartupFormController }) {
  return (
    <div className="fys-form-col">
      <div className="fys-form-inner">
        <form onSubmit={(e) => e.preventDefault()}>
          <DetailsContactStep ctrl={ctrl} />
        </form>

        <p className="fys-form-privacy">
          We only use these details to review your submission and get back to you.
        </p>
      </div>
    </div>
  );
}
