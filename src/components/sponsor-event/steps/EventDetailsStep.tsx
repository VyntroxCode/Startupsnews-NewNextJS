"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import type { SponsorEventFormController } from "../useSponsorEventForm";
import {
  validateDate,
  validateDescription,
  validateExternalUrl,
  validateSlug,
  validateTime,
  validateTitle,
} from "../validation";

/** Step 1 of 3 — everything about the event itself. It absorbed the old separate "Schedule" step
 * (date, time, description): four fields was a short screen, and asking for a date on a screen of
 * its own made the wizard longer without making any screen easier.
 *
 * The single "Location (City & Country)" text box is now the shared `CountryCityFields` — the same
 * searchable Country dropdown and curated City list /list-your-event uses — so the same city can no
 * longer arrive under several spellings. The controller still composes one `location` string from
 * them, which is what the API validates and emails, so the route's contract is unchanged. */
export function EventDetailsStep({
  ctrl,
  promotedCities,
}: {
  ctrl: SponsorEventFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const { data, errors } = ctrl;
  return (
    <div className="sp-step" data-step="1">
      <p className="sp-step-kicker">Event</p>
      <h3 className="sp-step-heading">Start With The Essentials.</h3>
      <FormField
        id="sp-title"
        label="Event Title"
        required
        value={data.title}
        error={errors.title}
        placeholder="e.g. GISEC Global 2026"
        onChange={ctrl.onTitleChange}
        onBlur={() => ctrl.blurValidate("title", validateTitle)}
      />
      <FormField
        id="sp-slug"
        label="Event URL"
        required
        value={data.slug}
        error={errors.slug}
        placeholder="e.g. gisec-global-2026"
        hint={
          <>
            Used to create your event page URL.
            {data.slug.trim() && (
              <span className="sp-slug-preview"> startupnews.fyi/events/{data.slug.trim()}</span>
            )}
          </>
        }
        onChange={ctrl.onSlugChange}
        onBlur={() => ctrl.blurValidate("slug", validateSlug)}
      />
      <CountryCityFields
        country={data.country}
        countryOther={data.countryOther}
        city={data.city}
        cityOther={data.cityOther}
        promotedCities={promotedCities}
        countryError={errors.location}
        onChangeCountry={(v) => ctrl.setField("country", v)}
        onChangeCountryOther={(v) => ctrl.setField("countryOther", v)}
        onChangeCity={(v) => ctrl.setField("city", v)}
        onChangeCityOther={(v) => ctrl.setField("cityOther", v)}
        onBlurCountry={() => {}}
        onBlurCity={() => {}}
      />
      {data.location.trim() ? (
        <p className="sp-location-pulse sp-location-echo">
          <span className="sp-preview-pulse" aria-hidden="true" />
          {data.location.trim()}
        </p>
      ) : null}
      <FormField
        id="sp-external-url"
        label="External URL / Redirection Link"
        optionalHint="(optional)"
        type="url"
        placeholder="https://your-event-site.com"
        value={data.externalUrl}
        error={errors.externalUrl}
        onChange={(v) => ctrl.updateAndMaybeValidate("externalUrl", v, "externalUrl", validateExternalUrl)}
        onBlur={() => ctrl.blurValidate("externalUrl", validateExternalUrl)}
      />

      {/* Absorbed from the removed Schedule step. */}
      <div className="sp-field-row">
        <FormField
          id="sp-date"
          label="Date"
          required
          type="date"
          value={data.date}
          error={errors.date}
          onChange={(v) => ctrl.updateAndMaybeValidate("date", v, "date", validateDate)}
          onBlur={() => ctrl.blurValidate("date", validateDate)}
        />
        <FormField
          id="sp-time"
          label="Time"
          required
          type="time"
          value={data.time}
          error={errors.time}
          onChange={(v) => ctrl.updateAndMaybeValidate("time", v, "time", validateTime)}
          onBlur={() => ctrl.blurValidate("time", validateTime)}
        />
      </div>
      <FormField
        id="sp-description"
        label="Event Description"
        required
        type="textarea"
        rows={6}
        value={data.description}
        error={errors.description}
        placeholder="What's the event about? Do add the venue's Google Maps link if it's an in-person event."
        hint="Tip: include the event venue's Google Maps link here."
        onChange={(v) => ctrl.updateAndMaybeValidate("description", v, "description", validateDescription)}
        onBlur={() => ctrl.blurValidate("description", validateDescription)}
      />

      <div className="wizard-nav no-back">
        <Button variant="primary" className="sp-cta" onClick={ctrl.goNext}>
          <span>Next</span>
          <span className="sp-cta-arrow" aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}
