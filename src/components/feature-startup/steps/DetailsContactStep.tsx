"use client";

import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import { FieldReveal } from "../FieldReveal";
import { TELL_US_MORE_MAX_LENGTH } from "@/modules/sales-tracker/domain/types";
import type { FeatureStartupFormController } from "../useFeatureStartupForm";
import {
  validateCity,
  validateCompanyName,
  validateCountry,
  validateEmail,
  validateName,
  validatePhone,
  validateWebsite,
} from "../validation";

/** The whole form — who's behind the startup and how to reach them. It carries what used to be two
 * separate validation steps (Details, then Contact & Location), and since the pitch-deck upload was
 * removed there is nothing after it, so this page submits rather than advancing.
 *
 * Two fields are collected the same way /list-your-event collects them, using the very same
 * components rather than a look-alike:
 *
 *   Phone     — `PhoneField`, a country-code select beside the number, which brings the per-country
 *               length rules with it (see validatePhone). It replaced a single free-text box whose
 *               "+1 555 000 0000" placeholder was the only hint that a code was wanted at all.
 *   Location  — `CountryCityFields`, the searchable Country dropdown and the City list that reads
 *               the admin Partnership Tracker's curated cities, each with an "Other (add manually)"
 *               escape. It replaced ONE box labelled "Country / City", which stored whatever was
 *               typed — so "Bengaluru, India", "bangalore" and "IN" all arrived as different
 *               places. Both are required (validateCountry / validateCity), so every lead reaches the Sales
 *               Tracker with a location.
 *
 * The controller still exposes one `phone` and one `countryCity` string composed from these inputs,
 * so nothing downstream had to change. The FieldReveal wrappers ladder the fields in on scroll. */
export function DetailsContactStep({
  ctrl,
  promotedCities,
}: {
  ctrl: FeatureStartupFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const { data, errors } = ctrl;
  return (
    <div className="fys-step">
      <FieldReveal index={0}>
        <p className="fys-step-group-label">About your startup</p>
      </FieldReveal>
      <FieldReveal index={1}>
        <FormField
          id="fys-name"
          label="Your Name"
          required
          value={data.name}
          error={errors.name}
          onChange={(v) => ctrl.updateAndMaybeValidate("name", v, "name", validateName)}
          onBlur={() => ctrl.blurValidate("name", validateName)}
        />
      </FieldReveal>
      <FieldReveal index={2}>
        <FormField
          id="fys-company"
          label="Company Name"
          required
          value={data.companyName}
          error={errors.companyName}
          onChange={(v) => ctrl.updateAndMaybeValidate("companyName", v, "companyName", validateCompanyName)}
          onBlur={() => ctrl.blurValidate("companyName", validateCompanyName)}
        />
      </FieldReveal>

      <FieldReveal index={3}>
        <p className="fys-step-group-label">How we reach you</p>
      </FieldReveal>
      {/* Email and phone share a row, country and city the next — the same two pairs every lead
          page on the site now lays out. Inside a half-row the code select is trimmed to 100px
          (`.fys-field-row .phone-row`, globals.css) so the number keeps a usable width. */}
      <FieldReveal index={4}>
        <div className="fys-field-row">
          <FormField
            id="fys-email"
            label="Official Email"
            required
            type="email"
            value={data.email}
            error={errors.email}
            onChange={(v) => ctrl.updateAndMaybeValidate("email", v, "email", validateEmail)}
            onBlur={() => ctrl.blurValidate("email", validateEmail)}
          />
          <PhoneField
            id="fys-phone"
            label="Phone / WhatsApp"
            phoneCode={data.phoneCode}
            phoneCodeCustom={data.phoneCodeCustom}
            phoneNumber={data.phoneNumber}
            error={errors.phone}
            /* updateAndMaybeValidate, not setField: PhoneField fires onBlurValidate straight after
               a code change, and that validates the state as it was BEFORE the change landed. If
               an error was already on screen it would be re-asserted from stale values and stick.
               Queuing a revalidation against the committed data clears it on the next commit. */
            onChangeCode={(v) => ctrl.updateAndMaybeValidate("phoneCode", v, "phone", validatePhone)}
            onChangeCustomCode={(v) =>
              ctrl.updateAndMaybeValidate("phoneCodeCustom", v, "phone", validatePhone)
            }
            onChangeNumber={(v) => ctrl.updateAndMaybeValidate("phoneNumber", v, "phone", validatePhone)}
            onBlurValidate={() => ctrl.blurValidate("phone", validatePhone)}
          />
        </div>
      </FieldReveal>
      <FieldReveal index={5}>
        <FormField
          id="fys-website"
          label="Website"
          optionalHint="(optional)"
          type="url"
          placeholder="https://yourstartup.com"
          value={data.website}
          error={errors.website}
          onChange={(v) => ctrl.updateAndMaybeValidate("website", v, "website", validateWebsite)}
          onBlur={() => ctrl.blurValidate("website", validateWebsite)}
        />
      </FieldReveal>
      <FieldReveal index={6}>
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
      </FieldReveal>
      <FieldReveal index={7}>
        <FormField
          id="fys-tell-us-more"
          label="Tell Us More"
          optionalHint="(optional)"
          type="textarea"
          rows={4}
          maxLength={TELL_US_MORE_MAX_LENGTH}
          placeholder="Anything else you would like us to know"
          value={data.tellUsMore}
          onChange={(v) => ctrl.setField("tellUsMore", v)}
        />
      </FieldReveal>

      <FieldReveal index={8}>
        <div className="wizard-nav no-back">
          <Button
            variant="primary"
            onClick={ctrl.submit}
            busy={ctrl.submitting}
            busyLabel="Submitting…"
          >
            Submit Your Startup
          </Button>
        </div>
        {ctrl.submitError ? (
          <p className="fys-submit-error" role="alert">
            {ctrl.submitError}
          </p>
        ) : null}
      </FieldReveal>
    </div>
  );
}
