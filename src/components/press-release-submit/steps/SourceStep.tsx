"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateCity, validateCountry, validateWebsite } from "@/components/lead-forms/shared/validation";
import { staggerVariants, staggerItemVariants } from "../motion";
import { TELL_US_MORE_MAX_LENGTH } from "@/modules/sales-tracker/domain/types";

/** Step 02 — "The Source". Canonical validation step 5: website (optional) plus the location
 * (country and city, both required), then the optional "Tell us more" box. Email used to open this step; it moved to The Story,
 * straight after the phone number, on request. See StoryStep for how the split is kept in step with
 * validation.
 *
 * Location is collected by the shared `CountryCityFields` — the searchable Country dropdown and
 * the City list that reads the admin Partnership Tracker's curated cities, the same control
 * /list-your-event uses. It replaced ONE box labelled "Country / City" that stored whatever was
 * typed, so the same city arrived under several spellings. Both halves are required; the controller still exposes one composed `countryCity` string, so
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
          cityAsText
          cityOptional
          country={data.country}
          countryOther={data.countryOther}
          city={data.city}
          cityOther={data.cityOther}
          promotedCities={promotedCities}
          countryError={errors.country}
          cityError={errors.city}
          onChangeCountry={(v) => ctrl.updateAndMaybeValidate("country", v, "country", validateCountry)}
          onChangeCountryOther={(v) => ctrl.setField("countryOther", v)}
          onChangeCity={(v) => ctrl.updateAndMaybeValidate("city", v, "city", validateCity)}
          onChangeCityOther={(v) => ctrl.updateAndMaybeValidate("cityOther", v, "city", validateCity)}
          onBlurCountry={() => ctrl.blurValidate("country", validateCountry)}
          onBlurCity={() => ctrl.blurValidate("city", validateCity)}
        />
      </motion.div>
      <motion.div variants={staggerItemVariants}>
        <FormField
          id="pr-tell-us-more"
          label="Tell Us More"
          optionalHint="(optional)"
          type="textarea"
          rows={4}
          maxLength={TELL_US_MORE_MAX_LENGTH}
          placeholder="Anything else you would like us to know"
          value={data.tellUsMore}
          onChange={(v) => ctrl.setField("tellUsMore", v)}
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
