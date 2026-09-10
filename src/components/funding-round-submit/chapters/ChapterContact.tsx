"use client";

import { FormField } from "@/components/ui/FormField";
import { ChapterHeader } from "../ChapterHeader";
import { ChapterContinue } from "../ChapterContinue";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validateEmail, validateWebsite } from "@/components/lead-forms/shared/validation";

export function ChapterContact({
  ctrl,
  onContinue,
}: {
  ctrl: LeadFormController;
  onContinue: () => void;
}) {
  const { data, errors } = ctrl;
  return (
    <section id="fr-chapter-contact" data-fr-chapter="contact" className="fr-chapter">
      <div className="fr-container">
        <ChapterHeader
          n="02"
          eyebrow="Contact & Presence"
          title="Where the world can find you."
          lede="An official email our editorial desk can reach you at, and where your company already has a presence online."
        />
        <div className="fr-chapter-fields">
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
          <div className="fr-field-row">
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
          </div>
          <ChapterContinue label="Review" onClick={onContinue} />
        </div>
      </div>
    </section>
  );
}
