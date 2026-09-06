"use client";

import { CountryCityFields } from "../CountryCityFields";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { SubmitEventFormController } from "../useSubmitEventForm";
import {
  isOnlineEvent,
  validateCity,
  validateCountry,
  validateExternalUrl,
  validateTitle,
  validateVenueAddress,
  validateVenueMapLink,
} from "../validation";
import { PARTNERSHIP_TYPE_OPTIONS } from "@/modules/partnership-events/domain/types";

const EVENT_TYPE_OPTIONS = PARTNERSHIP_TYPE_OPTIONS.map((t) => ({ value: t, label: t }));

export function EventBasicsStep({
  ctrl,
  promotedCities,
}: {
  ctrl: SubmitEventFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const { data, errors } = ctrl;
  // Slug is still auto-derived from the title and submitted with the form — it just isn't shown
  // here any more; the organiser has no reason to think about it.
  const online = isOnlineEvent(data);

  return (
    <div className="wizard-step" data-step="2">
      <div className="field" id="field-event-type">
        <label>Event Type</label>
        <CustomSelect
          options={EVENT_TYPE_OPTIONS}
          value={data.eventType}
          onChange={ctrl.onEventTypeChange}
          placeholder="Select event type"
          ariaLabel="Event Type"
        />
      </div>
      <FormField
        id="title"
        label="Event Title"
        required
        placeholder="e.g. Startup Mixer | Mumbai | 14 Mar 2026"
        value={data.title}
        error={errors.title}
        onChange={(v) => {
          ctrl.onTitleChange(v);
          if (errors.title) ctrl.blurValidate("title", validateTitle);
        }}
        onBlur={() => ctrl.blurValidate("title", validateTitle)}
      />
      <CountryCityFields
        country={data.country}
        countryOther={data.countryOther}
        city={data.city}
        cityOther={data.cityOther}
        countryError={errors.country}
        cityError={errors.city}
        promotedCities={promotedCities}
        locked={online}
        lockedHint="Locked — this is an online (virtual) event."
        onChangeCountry={(v) => ctrl.updateAndMaybeValidate("country", v, "country", validateCountry)}
        onChangeCountryOther={(v) => ctrl.updateAndMaybeValidate("countryOther", v, "country", validateCountry)}
        onChangeCity={(v) => ctrl.updateAndMaybeValidate("city", v, "city", validateCity)}
        onChangeCityOther={(v) => ctrl.updateAndMaybeValidate("cityOther", v, "city", validateCity)}
        onBlurCountry={() => ctrl.blurValidate("country", validateCountry)}
        onBlurCity={() => ctrl.blurValidate("city", validateCity)}
      />
      {/* An online event has no street address to give, so the pair drops to optional rather than
          forcing a placeholder address in — the API relaxes exactly the same two fields. The
          LABEL stays "Venue" for every type: only the requirement changes, not what the field is. */}
      <div className="field-row">
        <FormField
          id="venue-address"
          label="Venue (Complete Address)"
          required={!online}
          type="textarea"
          rows={3}
          hint={online ? "Optional for an online event." : undefined}
          value={data.venueAddress}
          error={errors.venueAddress}
          onChange={(v) => ctrl.updateAndMaybeValidate("venueAddress", v, "venueAddress", validateVenueAddress)}
          onBlur={() => ctrl.blurValidate("venueAddress", validateVenueAddress)}
        />
        <FormField
          id="venue-map-link"
          label="Google Location (Maps link)"
          required={!online}
          type="url"
          placeholder="https://maps.google.com/..."
          hint={online ? "Optional for an online event." : undefined}
          value={data.venueMapLink}
          error={errors.venueMapLink}
          onChange={(v) => ctrl.updateAndMaybeValidate("venueMapLink", v, "venueMapLink", validateVenueMapLink)}
          onBlur={() => ctrl.blurValidate("venueMapLink", validateVenueMapLink)}
        />
      </div>
      <FormField
        id="external-url"
        label="Event Registration Link"
        required
        type="url"
        placeholder="https://..."
        value={data.externalUrl}
        error={errors.externalUrl}
        onChange={(v) => ctrl.updateAndMaybeValidate("externalUrl", v, "externalUrl", validateExternalUrl)}
        onBlur={() => ctrl.blurValidate("externalUrl", validateExternalUrl)}
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
