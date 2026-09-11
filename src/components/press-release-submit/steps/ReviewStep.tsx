"use client";

import { motion } from "motion/react";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import type { LeadFormData } from "@/components/lead-forms/shared/types";
import {
  validateCompanyName,
  validateEmail,
  validateName,
  validatePhone,
  validateWebsite,
} from "@/components/lead-forms/shared/validation";
import { staggerVariants, staggerItemVariants } from "../motion";

/** Which step each field lives on, so a failed check can send the reader back to the field itself
 * rather than to a generic "something is wrong". Ordered as the reader met them. */
const FIELDS: Array<{
  field: keyof LeadFormData;
  label: string;
  step: number;
  validate?: (d: LeadFormData) => string;
  fallback: string;
}> = [
  { field: "companyName", label: "Company", step: 1, validate: validateCompanyName, fallback: "Not entered yet" },
  { field: "name", label: "Contact", step: 1, validate: validateName, fallback: "Not entered yet" },
  { field: "phone", label: "Phone / WhatsApp", step: 1, validate: validatePhone, fallback: "Not entered yet" },
  { field: "email", label: "Official email", step: 2, validate: validateEmail, fallback: "Not entered yet" },
  { field: "website", label: "Website", step: 2, validate: validateWebsite, fallback: "Not provided" },
  { field: "countryCity", label: "Country / City", step: 2, fallback: "Not provided" },
];

/** Step 03 — "Review". Adds no fields of its own: it is a read-back of what the reader already
 * entered, with an Edit link per row, and it is why the form's third step group is empty in
 * `useLeadForm`'s `stepGroups`.
 *
 * Submitting re-runs every validator even though `goNext` already gated steps 1 and 2 on the way
 * here — cheap insurance, and it means the button can never post a half-filled submission if the
 * step wiring is ever changed. A failure sends the reader back to the step holding the first bad
 * field, with that field's error already showing. */
export function ReviewStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, submitting } = ctrl;

  function handleSubmit() {
    let firstInvalidStep: number | null = null;
    for (const { field, step, validate } of FIELDS) {
      if (!validate) continue;
      const message = validate(data);
      ctrl.blurValidate(field, validate);
      if (message && firstInvalidStep === null) firstInvalidStep = step;
    }
    if (firstInvalidStep !== null) {
      ctrl.goToStep(firstInvalidStep);
      return;
    }
    ctrl.submit();
  }

  return (
    <motion.div className="pr-step" variants={staggerVariants} initial="hidden" animate="show">
      <motion.div className="pr-step-head" variants={staggerItemVariants}>
        <p className="pr-step-kicker">Review</p>
        <p className="pr-step-hint">A last look before this reaches the desk. Nothing is sent until you submit.</p>
      </motion.div>

      <motion.dl className="pr-review" variants={staggerItemVariants}>
        {FIELDS.map(({ field, label, step, fallback }) => {
          const value = data[field];
          const text = typeof value === "string" && value.trim() ? value : fallback;
          const empty = !(typeof value === "string" && value.trim());
          return (
            <div className="pr-review-row" key={field}>
              <dt>{label}</dt>
              <dd className={empty ? "is-empty" : undefined}>
                <span>{text}</span>
                <button type="button" className="pr-review-edit" onClick={() => ctrl.goToStep(step)}>
                  Edit
                </button>
              </dd>
            </div>
          );
        })}
      </motion.dl>

      <motion.p className="pr-review-note" variants={staggerItemVariants}>
        Submitting sends these details to our editorial team for review. It is not a guarantee of
        coverage — if the story is a fit, someone will be in touch.
      </motion.p>

      <motion.div className="pr-step-nav" variants={staggerItemVariants}>
        <button type="button" className="pr-btn pr-btn-back" onClick={ctrl.goBack} disabled={submitting}>
          Back
        </button>
        <button
          type="button"
          className="pr-btn pr-btn-primary"
          onClick={handleSubmit}
          aria-busy={submitting || undefined}
          disabled={submitting}
        >
          {submitting ? "Sending to the press desk…" : "Submit for Editorial Review"}
          {submitting ? null : (
            <span className="pr-btn-arrow" aria-hidden="true">
              →
            </span>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
