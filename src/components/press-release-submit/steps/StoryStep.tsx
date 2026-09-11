"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import {
  validateCompanyName,
  validateName,
  validatePhone,
} from "@/components/lead-forms/shared/validation";
import { staggerVariants, staggerItemVariants } from "../motion";

/** Step 01 — "The Story". Holds exactly the fields of canonical validation step 1 (companyName,
 * name, phone), which is what lets `goNext` gate this page without ever showing an error against a
 * field the reader cannot see. Do not move a field between this step and The Source without
 * moving it in `lead-forms/shared/validation.ts`'s STEP_VALIDATOR_MAP too — and note that map is
 * shared with Feature Your Startup. */
export function StoryStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors } = ctrl;

  return (
    <motion.div className="pr-step" variants={staggerVariants} initial="hidden" animate="show">
      <motion.div className="pr-step-head" variants={staggerItemVariants}>
        <p className="pr-step-kicker">The Story</p>
        <p className="pr-step-hint">Who is announcing, and the fastest way for an editor to reach you.</p>
      </motion.div>

      <motion.div variants={staggerItemVariants}>
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
      <motion.div variants={staggerItemVariants}>
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
      <motion.div variants={staggerItemVariants}>
        {/* The site's shared country-code control, as on /list-your-event — it brings the
            per-country length rules with it (see validatePhone). It replaced a free-text box whose
            "+1 555 000 0000" placeholder was the only hint a dial code was wanted. */}
        <PhoneField
          id="pr-phone"
          label="Phone / WhatsApp"
          phoneCode={data.phoneCode}
          phoneCodeCustom={data.phoneCodeCustom}
          phoneNumber={data.phoneNumber}
          error={errors.phone}
          /* updateAndMaybeValidate, not setField: PhoneField fires onBlurValidate straight after a
             code change, which validates the state as it was BEFORE the change landed. An error
             already on screen would be re-asserted from stale values and stick. */
          onChangeCode={(v) => ctrl.updateAndMaybeValidate("phoneCode", v, "phone", validatePhone)}
          onChangeCustomCode={(v) =>
            ctrl.updateAndMaybeValidate("phoneCodeCustom", v, "phone", validatePhone)
          }
          onChangeNumber={(v) => ctrl.updateAndMaybeValidate("phoneNumber", v, "phone", validatePhone)}
          onBlurValidate={() => ctrl.blurValidate("phone", validatePhone)}
        />
      </motion.div>

      <motion.div className="pr-step-nav pr-step-nav-solo" variants={staggerItemVariants}>
        <button type="button" className="pr-btn pr-btn-primary" onClick={ctrl.goNext}>
          Next: The Source
          <span className="pr-btn-arrow" aria-hidden="true">→</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
