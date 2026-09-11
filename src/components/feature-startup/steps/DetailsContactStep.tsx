"use client";

import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import { FieldReveal } from "../FieldReveal";
import type { FeatureStartupFormController } from "../useFeatureStartupForm";
import {
  validateCompanyName,
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
 *               places. Passing `required={false}` keeps the pair optional, as that box was.
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
      {/* Phone takes a full row rather than half of one. The form column is 470px, so a half is
          ~228px — with the code select taking 116px of that, the number itself was left with about
          eight characters of visible width. Email moves down to pair with Website instead. */}
      <FieldReveal index={4}>
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
      </FieldReveal>
      <FieldReveal index={5}>
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
        </div>
      </FieldReveal>
      <FieldReveal index={6}>
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
      </FieldReveal>

      <FieldReveal index={7}>
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
      </FieldReveal>
    </div>
  );
}
