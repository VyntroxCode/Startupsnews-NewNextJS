"use client";

import { FormField } from "../FormField";
import { SpeakersEditor } from "../SpeakersEditor";
import type { SubmitEventFormController } from "../useSubmitEventForm";
import {
  validateEndTime,
  validateSpeakers,
  validateStartDate,
  validateStartTime,
  validateVenueAddress,
  validateVenueMapLink,
} from "../validation";

export function DateVenueStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, errors } = ctrl;
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="wizard-step" data-step="3">
      <div className="subhead">Date, Time, Venue &amp; Speakers</div>
      <div className="field-row">
        <FormField
          id="start-date"
          label="Event Start Date"
          required
          type="date"
          min={todayIso}
          value={data.startDate}
          error={errors.startDate}
          onChange={(v) => ctrl.updateAndMaybeValidate("startDate", v, "startDate", validateStartDate)}
          onBlur={() => ctrl.blurValidate("startDate", validateStartDate)}
        />
        <FormField
          id="start-time"
          label="Event Start Time"
          required
          type="time"
          value={data.startTime}
          error={errors.startTime}
          onChange={(v) => ctrl.updateAndMaybeValidate("startTime", v, "startTime", validateStartTime)}
          onBlur={() => ctrl.blurValidate("startTime", validateStartTime)}
        />
      </div>
      <div className="field-row">
        <FormField
          id="end-date"
          label="Event End Date"
          type="date"
          value={data.endDate}
          hint="Leave blank to use the start date."
          onChange={(v) => ctrl.updateAndMaybeValidate("endDate", v, "endTime", validateEndTime)}
        />
        <FormField
          id="end-time"
          label="Event End Time"
          type="time"
          value={data.endTime}
          error={errors.endTime}
          hint="Leave blank to default to 11:59 PM."
          onChange={(v) => ctrl.updateAndMaybeValidate("endTime", v, "endTime", validateEndTime)}
          onBlur={() => ctrl.blurValidate("endTime", validateEndTime)}
        />
      </div>
      <div className="field-subhead">Venue</div>
      <FormField
        id="venue-address"
        label="Complete Address"
        required
        type="textarea"
        rows={3}
        value={data.venueAddress}
        error={errors.venueAddress}
        onChange={(v) => ctrl.updateAndMaybeValidate("venueAddress", v, "venueAddress", validateVenueAddress)}
        onBlur={() => ctrl.blurValidate("venueAddress", validateVenueAddress)}
      />
      <FormField
        id="venue-map-link"
        label="Google Location (Maps link)"
        required
        type="url"
        placeholder="https://maps.google.com/..."
        value={data.venueMapLink}
        error={errors.venueMapLink}
        onChange={(v) => ctrl.updateAndMaybeValidate("venueMapLink", v, "venueMapLink", validateVenueMapLink)}
        onBlur={() => ctrl.blurValidate("venueMapLink", validateVenueMapLink)}
      />

      <div className="field-subhead">Key Speakers / Guests</div>
      <SpeakersEditor
        speakers={data.speakers}
        error={errors.speakers}
        onChange={(speakers) => ctrl.updateAndMaybeValidate("speakers", speakers, "speakers", validateSpeakers)}
        onBlurValidate={() => ctrl.blurValidate("speakers", validateSpeakers)}
      />

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
