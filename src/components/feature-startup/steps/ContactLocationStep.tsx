"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { FeatureStartupFormController } from "../useFeatureStartupForm";
import { validateEmail, validateWebsite } from "../validation";

export function ContactLocationStep({ ctrl }: { ctrl: FeatureStartupFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="fys-step" data-step="2">
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
      <FormField
        id="fys-country-city"
        label="Country / City"
        optionalHint="(optional)"
        placeholder="e.g. India, Bengaluru"
        value={data.countryCity}
        onChange={(v) => ctrl.setField("countryCity", v)}
      />
      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>
          Back
        </Button>
        <Button variant="primary" onClick={ctrl.goNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
