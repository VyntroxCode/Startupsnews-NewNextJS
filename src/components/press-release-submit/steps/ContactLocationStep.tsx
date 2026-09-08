"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateEmail, validateWebsite } from "@/components/lead-forms/shared/validation";
import { fieldGroupVariants, fieldItemVariants } from "../stepAnimations";

export function ContactLocationStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors } = ctrl;
  return (
    <motion.div className="pr-step" data-step="2" variants={fieldGroupVariants} initial="hidden" animate="show">
      <motion.div variants={fieldItemVariants}>
        <FormField
          id="pr-email"
          label="Official Email"
          required
          type="email"
          value={data.email}
          error={errors.email}
          onChange={(v) => ctrl.updateAndMaybeValidate("email", v, "email", validateEmail)}
          onBlur={() => ctrl.blurValidate("email", validateEmail)}
        />
      </motion.div>
      <motion.div variants={fieldItemVariants}>
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
      </motion.div>
      <motion.div variants={fieldItemVariants}>
        <FormField
          id="pr-country-city"
          label="Country / City"
          optionalHint="(optional)"
          placeholder="e.g. India, Bengaluru"
          value={data.countryCity}
          onChange={(v) => ctrl.setField("countryCity", v)}
        />
      </motion.div>
      <motion.div className="wizard-nav" variants={fieldItemVariants}>
        <Button variant="ghost" onClick={ctrl.goBack}>
          Back
        </Button>
        <Button variant="primary" onClick={ctrl.goNext}>
          Next
        </Button>
      </motion.div>
    </motion.div>
  );
}
