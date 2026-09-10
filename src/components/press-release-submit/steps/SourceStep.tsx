"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateEmail, validateWebsite } from "@/components/lead-forms/shared/validation";
import { staggerVariants, staggerItemVariants } from "../motion";

/** Step 02 — "The Source". Canonical validation step 2 (email, website) plus countryCity, which
 * has no validator of its own because it is optional and free-form. See StoryStep for why the
 * split falls exactly here. */
export function SourceStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors } = ctrl;

  return (
    <motion.div className="pr-step" variants={staggerVariants} initial="hidden" animate="show">
      <motion.div className="pr-step-head" variants={staggerItemVariants}>
        <p className="pr-step-kicker">
          <span className="pr-step-kicker-n">02</span> The Source
        </p>
        <p className="pr-step-hint">Where our desk can write back, and where the story can be verified.</p>
      </motion.div>

      <motion.div variants={staggerItemVariants}>
        <FormField
          id="pr-email"
          label="Official Email"
          required
          type="email"
          hint="Use a company address where possible — it helps us confirm the announcement is official."
          value={data.email}
          error={errors.email}
          onChange={(v) => ctrl.updateAndMaybeValidate("email", v, "email", validateEmail)}
          onBlur={() => ctrl.blurValidate("email", validateEmail)}
        />
      </motion.div>
      <motion.div className="pr-field-row" variants={staggerItemVariants}>
        <FormField
          id="pr-website"
          label="Website"
          optionalHint="(optional)"
          type="url"
          placeholder="https://yourstartup.com"
          value={data.website}
          error={errors.website}
          onChange={(v) => ctrl.updateAndMaybeValidate("website", v, "website", validateWebsite)}
          onBlur={() => ctrl.blurValidate("website", validateWebsite)}
        />
        <FormField
          id="pr-country-city"
          label="Country / City"
          optionalHint="(optional)"
          placeholder="e.g. India, Bengaluru"
          value={data.countryCity}
          onChange={(v) => ctrl.setField("countryCity", v)}
        />
      </motion.div>

      <motion.div className="pr-step-nav" variants={staggerItemVariants}>
        <button type="button" className="pr-btn pr-btn-back" onClick={ctrl.goBack}>
          Back
        </button>
        <button type="button" className="pr-btn pr-btn-primary" onClick={ctrl.goNext}>
          Next: Review
          <span className="pr-btn-arrow" aria-hidden="true">→</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
