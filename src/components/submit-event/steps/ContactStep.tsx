"use client";

import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import type { SubmitEventFormController } from "../useSubmitEventForm";
import {
  validateEmail,
  validateOrganizerName,
  validateOrganizerOrg,
  validatePhone,
} from "../validation";

export function ContactStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="wizard-step" data-step="1">
      <div className="field-row">
        <FormField
          id="organizer-name"
          label="Organizer Name (Point of Contact)"
          required
          value={data.organizerName}
          error={errors.organizerName}
          onChange={(v) => ctrl.updateAndMaybeValidate("organizerName", v, "organizerName", validateOrganizerName)}
          onBlur={() => ctrl.blurValidate("organizerName", validateOrganizerName)}
        />
        <FormField
          id="organizer-org"
          label="Company Name"
          required
          value={data.organizerOrg}
          error={errors.organizerOrg}
          onChange={(v) => ctrl.updateAndMaybeValidate("organizerOrg", v, "organizerOrg", validateOrganizerOrg)}
          onBlur={() => ctrl.blurValidate("organizerOrg", validateOrganizerOrg)}
        />
      </div>
      <div className="field-row">
        <FormField
          id="organizer-email"
          label="e-mail"
          required
          type="email"
          value={data.organizerEmail}
          error={errors.organizerEmail}
          onChange={(v) => ctrl.updateAndMaybeValidate("organizerEmail", v, "organizerEmail", validateEmail)}
          onBlur={() => ctrl.blurValidate("organizerEmail", validateEmail)}
        />
        <PhoneField
          phoneCode={data.phoneCode}
          phoneCodeCustom={data.phoneCodeCustom}
          phoneNumber={data.phoneNumber}
          error={errors.organizerPhone}
          onChangeCode={(v) => ctrl.setField("phoneCode", v)}
          onChangeCustomCode={(v) =>
            ctrl.updateAndMaybeValidate("phoneCodeCustom", v, "organizerPhone", validatePhone)
          }
          onChangeNumber={(v) => ctrl.updateAndMaybeValidate("phoneNumber", v, "organizerPhone", validatePhone)}
          onBlurValidate={() => ctrl.blurValidate("organizerPhone", validatePhone)}
        />
      </div>
      <div className="wizard-nav no-back">
        <Button variant="primary" onClick={ctrl.goNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
