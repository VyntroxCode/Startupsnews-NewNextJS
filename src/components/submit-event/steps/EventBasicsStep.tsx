"use client";

import { CountryCityFields } from "../CountryCityFields";
import { CustomSelect } from "../CustomSelect";
import { FormField } from "../FormField";
import { DESC_TARGET_WORDS } from "../constants";
import type { SubmitEventFormController } from "../useSubmitEventForm";
import { countWords } from "../validation";
import {
  validateCity,
  validateCountry,
  validateDescription,
  validateExternalUrl,
  validateSlug,
  validateTitle,
} from "../validation";
import { PARTNERSHIP_TYPE_OPTIONS } from "@/modules/partnership-events/domain/types";

const EVENT_TYPE_OPTIONS = PARTNERSHIP_TYPE_OPTIONS.map((t) => ({ value: t, label: t }));

export function EventBasicsStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, errors } = ctrl;
  const wordCount = countWords(data.description);
  const targetMet = wordCount >= DESC_TARGET_WORDS;

  return (
    <div className="wizard-step" data-step="2">
      <div className="subhead">Event Basics</div>
      <FormField
        id="title"
        label="Event Title"
        required
        value={data.title}
        error={errors.title}
        onChange={(v) => {
          ctrl.onTitleChange(v);
          if (errors.title) ctrl.blurValidate("title", validateTitle);
        }}
        onBlur={() => ctrl.blurValidate("title", validateTitle)}
      />
      <FormField
        id="slug"
        label="Slug"
        optionalHint="(Auto-Generated, Editable)"
        value={data.slug}
        error={errors.slug}
        onChange={(v) => {
          ctrl.onSlugChange(v);
          if (errors.slug) ctrl.blurValidate("slug", validateSlug);
        }}
        onBlur={() => ctrl.blurValidate("slug", validateSlug)}
      />
      <CountryCityFields
        country={data.country}
        countryOther={data.countryOther}
        city={data.city}
        cityOther={data.cityOther}
        countryError={errors.country}
        cityError={errors.city}
        onChangeCountry={(v) => ctrl.setField("country", v)}
        onChangeCountryOther={(v) => ctrl.updateAndMaybeValidate("countryOther", v, "country", validateCountry)}
        onChangeCity={(v) => ctrl.setField("city", v)}
        onChangeCityOther={(v) => ctrl.updateAndMaybeValidate("cityOther", v, "city", validateCity)}
        onBlurCountry={() => ctrl.blurValidate("country", validateCountry)}
        onBlurCity={() => ctrl.blurValidate("city", validateCity)}
      />
      <FormField
        id="external-url"
        label="Registration Link"
        required
        type="url"
        placeholder="https://..."
        value={data.externalUrl}
        error={errors.externalUrl}
        onChange={(v) => ctrl.updateAndMaybeValidate("externalUrl", v, "externalUrl", validateExternalUrl)}
        onBlur={() => ctrl.blurValidate("externalUrl", validateExternalUrl)}
      />
      <div className="field" id="field-event-type">
        <label>Event Type</label>
        <CustomSelect
          options={EVENT_TYPE_OPTIONS}
          value={data.eventType}
          onChange={(v) => ctrl.setField("eventType", v)}
          ariaLabel="Event Type"
        />
      </div>

      <div className={"field" + (errors.description ? " has-error" : "")} id="field-description">
        <label htmlFor="f-description">Event Description *</label>
        <textarea
          id="f-description"
          rows={6}
          value={data.description}
          onChange={(e) =>
            ctrl.updateAndMaybeValidate("description", e.target.value, "description", validateDescription)
          }
          onBlur={() => ctrl.blurValidate("description", validateDescription)}
        />
        <div className="desc-meta">
          <div className="hint">
            Plain text is fine. ~400–500 words for a stronger listing — not required, just recommended.
          </div>
          <div className={"word-count" + (targetMet ? " target-met" : "")}>
            {wordCount} {wordCount === 1 ? "word" : "words"}
            {targetMet ? "" : " (aim for 400–500+)"}
          </div>
        </div>
        <div className={"field-error" + (errors.description ? " visible" : "")} id="err-description">
          {errors.description}
        </div>
      </div>

      <div className="wizard-nav">
        <button type="button" className="btn-ghost" onClick={ctrl.goBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={ctrl.goNext}>
          Next
        </button>
      </div>
    </div>
  );
}
