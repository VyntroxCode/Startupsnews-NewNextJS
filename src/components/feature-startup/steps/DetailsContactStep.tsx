"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
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
 * Every field, validator and error binding here is the original one; only the final action changed
 * from "Next" to "Submit". The FieldReveal wrappers ladder the fields in on scroll. */
export function DetailsContactStep({ ctrl }: { ctrl: FeatureStartupFormController }) {
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
      <FieldReveal index={4}>
        <div className="fys-field-row">
          <FormField
            id="fys-phone"
            label="Phone / WhatsApp"
            required
            type="tel"
            placeholder="+1 555 000 0000"
            value={data.phone}
            error={errors.phone}
            onChange={(v) => ctrl.updateAndMaybeValidate("phone", v, "phone", validatePhone)}
            onBlur={() => ctrl.blurValidate("phone", validatePhone)}
          />
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
        </div>
      </FieldReveal>
      <FieldReveal index={5}>
        <div className="fys-field-row">
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
          <FormField
            id="fys-country-city"
            label="Country / City"
            optionalHint="(optional)"
            placeholder="e.g. India, Bengaluru"
            value={data.countryCity}
            onChange={(v) => ctrl.setField("countryCity", v)}
          />
        </div>
      </FieldReveal>

      <FieldReveal index={6}>
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
