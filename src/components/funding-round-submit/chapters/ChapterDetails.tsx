"use client";

import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import { ChapterHeader } from "../ChapterHeader";
import { ChapterContinue } from "../ChapterContinue";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import {
  validateCompanyName,
  validateEmail,
  validateName,
  validatePhone,
  validateWebsite,
} from "@/components/lead-forms/shared/validation";

/** Every field this page collects, in one chapter. It used to be two — "Company & Founder" and
 * "Contact & Presence" — but six fields is one short screen, and the split meant scrolling past a
 * second chapter header to reach an email box. The fields, their validators and their ids are
 * unchanged from that split version, so nothing downstream (the review rows, the submit-jumps-to-
 * the-first-problem handler, the scroll-spy) had to learn a new shape beyond the chapter id.
 *
 * Two of them are now collected the way /list-your-event collects them, using the very same shared
 * components rather than look-alikes — the same change Feature Your Startup got:
 *
 *   Phone     — `PhoneField`, a country-code select beside the number, bringing the per-country
 *               length rules with it. It replaced a free-text box whose "+1 555 000 0000"
 *               placeholder was the only hint a code was wanted.
 *   Location  — `CountryCityFields`, the searchable Country dropdown and the City list that reads
 *               the admin Partnership Tracker's curated cities. It replaced ONE box labelled
 *               "Country / City" that stored whatever was typed, so the same city arrived under
 *               several spellings. `required={false}` keeps the pair optional, as that box was.
 *
 * The controller still exposes one composed `phone` and one `countryCity` string, so the review
 * rows below and the submit handler above were not touched. */
export function ChapterDetails({
  ctrl,
  onContinue,
  promotedCities,
}: {
  ctrl: LeadFormController;
  onContinue: () => void;
  promotedCities?: Record<string, string[]>;
}) {
  const { data, errors } = ctrl;
  return (
    <section id="fr-chapter-details" data-fr-chapter="details" className="fr-chapter">
      <div className="fr-container">
        <ChapterHeader
          eyebrow="Your Details"
          title="Tell us who's building this."
          lede="Your company, the founder we should be in touch with, and where the world can already find you."
        />
        <div className="fr-chapter-fields">
          {/* Three pairs and a website line: [Company | Name], [Email | Phone], Website,
              [Country | City] — the same email/phone and country/city pairing every lead page
              on the site now uses. */}
          <div className="fr-field-row">
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
              id="fr-name"
              label="Your Name"
              required
              value={data.name}
              error={errors.name}
              onChange={(v) => ctrl.updateAndMaybeValidate("name", v, "name", validateName)}
              onBlur={() => ctrl.blurValidate("name", validateName)}
            />
          </div>
          <div className="fr-field-row">
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
            <PhoneField
              id="fr-phone"
              label="Phone / WhatsApp"
              phoneCode={data.phoneCode}
              phoneCodeCustom={data.phoneCodeCustom}
              phoneNumber={data.phoneNumber}
              error={errors.phone}
              /* updateAndMaybeValidate, not setField: PhoneField fires onBlurValidate straight
                 after a code change, which validates the state as it was BEFORE the change
                 landed. An error already on screen would be re-asserted from stale values and
                 stick. */
              onChangeCode={(v) => ctrl.updateAndMaybeValidate("phoneCode", v, "phone", validatePhone)}
              onChangeCustomCode={(v) =>
                ctrl.updateAndMaybeValidate("phoneCodeCustom", v, "phone", validatePhone)
              }
              onChangeNumber={(v) => ctrl.updateAndMaybeValidate("phoneNumber", v, "phone", validatePhone)}
              onBlurValidate={() => ctrl.blurValidate("phone", validatePhone)}
            />
          </div>
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
          <ChapterContinue label="Review" onClick={onContinue} />
        </div>
      </div>
    </section>
  );
}
