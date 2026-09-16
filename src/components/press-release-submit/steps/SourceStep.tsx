"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateWebsite } from "@/components/lead-forms/shared/validation";
import { staggerVariants, staggerItemVariants } from "../motion";

/** Step 02 — "The Source". Canonical validation step 5 (website) plus the location, which has no
 * validator of its own because it is optional. Email used to open this step; it moved to The Story,
 * straight after the phone number, on request. See StoryStep for how the split is kept in step with
 * validation.
 *
 * Location is collected by the shared `CountryCityFields` — the searchable Country dropdown and
 * the City list that reads the admin Partnership Tracker's curated cities, the same control
 * /list-your-event uses. It replaced ONE box labelled "Country / City" that stored whatever was
 * typed, so the same city arrived under several spellings. `required={false}` keeps the pair
 * optional, as that box was; the controller still exposes one composed `countryCity` string, so
 * ReviewStep did not have to change. */
export function SourceStep({ ctrl, promotedCities }: {
  ctrl: LeadFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const { data, errors } = ctrl;

  return (
    <motion.div className="pr-step" variants={staggerVariants} initial="hidden" animate="show">
      <motion.div className="pr-step-head" variants={staggerItemVariants}>
        <p className="pr-step-kicker">The Source</p>
        <p className="pr-step-hint">Where the story can be verified, and where it is based.</p>
      </motion.div>

      <motion.div variants={staggerItemVariants}>
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
      <motion.div variants={staggerItemVariants}>
        <CountryCityFields
          country={data.country}
          countryOther={data.countryOther}
          city={data.city}
          cityOther={data.cityOther}
          promotedCities={promotedCities}
          required={false}
          onChangeCountry={(v) => ctrl.setField("country", v)}
          onChangeCountryOther={(v) => ctrl.setField("countryOther", v)}
          onChangeCity={(v) => ctrl.setField("city", v)}
          onChangeCityOther={(v) => ctrl.setField("cityOther", v)}
          onBlurCountry={() => {}}
          onBlurCity={() => {}}
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
