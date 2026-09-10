"use client";

import { FormField } from "@/components/ui/FormField";
import { ChapterHeader } from "../ChapterHeader";
import { ChapterContinue } from "../ChapterContinue";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateCompanyName, validateName, validatePhone } from "@/components/lead-forms/shared/validation";

export function ChapterCompanyFounder({
  ctrl,
  onContinue,
}: {
  ctrl: LeadFormController;
  onContinue: () => void;
}) {
  const { data, errors } = ctrl;
  return (
    <section id="fr-chapter-company" data-fr-chapter="company" className="fr-chapter">
      <div className="fr-container">
        <ChapterHeader
          n="01"
          eyebrow="Company & Founder"
          title="Tell us who's building this."
          lede="Your company's name and the founder we should be in touch with — the byline behind the milestone."
        />
        <div className="fr-chapter-fields">
          <FormField
            id="fr-company"
            label="Company Name"
            required
            value={data.companyName}
            error={errors.companyName}
            onChange={(v) => ctrl.updateAndMaybeValidate("companyName", v, "companyName", validateCompanyName)}
            onBlur={() => ctrl.blurValidate("companyName", validateCompanyName)}
          />
          <div className="fr-field-row">
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
          </div>
          <ChapterContinue label="Contact & Presence" onClick={onContinue} />
        </div>
      </div>
    </section>
  );
}
