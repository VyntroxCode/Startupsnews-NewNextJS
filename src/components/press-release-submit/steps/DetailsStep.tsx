"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateCompanyName, validateName, validatePhone } from "@/components/lead-forms/shared/validation";
import { fieldGroupVariants, fieldItemVariants } from "../stepAnimations";

export function DetailsStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors } = ctrl;
  return (
    <motion.div className="pr-step" data-step="1" variants={fieldGroupVariants} initial="hidden" animate="show">
      <motion.div variants={fieldItemVariants}>
        <FormField
          id="pr-name"
          label="Your Name"
          required
          value={data.name}
          error={errors.name}
          onChange={(v) => ctrl.updateAndMaybeValidate("name", v, "name", validateName)}
          onBlur={() => ctrl.blurValidate("name", validateName)}
        />
      </motion.div>
      <motion.div variants={fieldItemVariants}>
        <FormField
          id="pr-company"
          label="Company Name"
          required
          value={data.companyName}
          error={errors.companyName}
          onChange={(v) => ctrl.updateAndMaybeValidate("companyName", v, "companyName", validateCompanyName)}
          onBlur={() => ctrl.blurValidate("companyName", validateCompanyName)}
        />
      </motion.div>
      <motion.div variants={fieldItemVariants}>
        <FormField
          id="pr-phone"
          label="Phone / WhatsApp"
          required
          type="tel"
          placeholder="+1 555 000 0000"
          value={data.phone}
          error={errors.phone}
          onChange={(v) => ctrl.updateAndMaybeValidate("phone", v, "phone", validatePhone)}
          onBlur={() => ctrl.blurValidate("phone", validatePhone)}
        />
      </motion.div>
      <motion.div className="wizard-nav no-back" variants={fieldItemVariants}>
        <Button variant="primary" onClick={ctrl.goNext}>
          Next
        </Button>
      </motion.div>
    </motion.div>
  );
}
