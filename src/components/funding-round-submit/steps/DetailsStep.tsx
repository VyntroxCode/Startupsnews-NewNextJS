"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateCompanyName, validateName, validatePhone } from "@/components/lead-forms/shared/validation";

export function DetailsStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="fr-step" data-step="1">
      <FormField
        id="fr-name"
        label="Your Name"
        required
        value={data.name}
        error={errors.name}
        onChange={(v) => ctrl.updateAndMaybeValidate("name", v, "name", validateName)}
        onBlur={() => ctrl.blurValidate("name", validateName)}
      />
      <FormField
        id="fr-company"
        label="Company Name"
        required
        value={data.companyName}
        error={errors.companyName}
        onChange={(v) => ctrl.updateAndMaybeValidate("companyName", v, "companyName", validateCompanyName)}
        onBlur={() => ctrl.blurValidate("companyName", validateCompanyName)}
      />
      <FormField
        id="fr-phone"
        label="Phone / WhatsApp"
        required
        type="tel"
        placeholder="+1 555 000 0000"
        value={data.phone}
        error={errors.phone}
        onChange={(v) => ctrl.updateAndMaybeValidate("phone", v, "phone", validatePhone)}
        onBlur={() => ctrl.blurValidate("phone", validatePhone)}
      />
      <div className="wizard-nav no-back">
        <Button variant="primary" onClick={ctrl.goNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
