"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateEmail, validateWebsite } from "@/components/lead-forms/shared/validation";

export function ContactLocationStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="fr-step" data-step="2">
      <FormField
        id="fr-email"
        label="Official Email"
        required
        type="email"
        value={data.email}
        error={errors.email}
        onChange={(v) => ctrl.updateAndMaybeValidate("email", v, "email", validateEmail)}
        onBlur={() => ctrl.blurValidate("email", validateEmail)}
      />
      <FormField
        id="fr-website"
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
        id="fr-country-city"
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
