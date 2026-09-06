"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { SpeakersEditor } from "../SpeakersEditor";
import { DESC_TARGET_WORDS } from "../constants";
import type { SubmitEventFormController } from "../useSubmitEventForm";
import {
  countWords,
  validateDescription,
  validateEndDate,
  validateEndTime,
  validateSpeakers,
  validateStartDate,
  validateStartTime,
} from "../validation";

export function DateVenueStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, errors } = ctrl;
  const todayIso = new Date().toISOString().slice(0, 10);
  const wordCount = countWords(data.description);
  const targetMet = wordCount >= DESC_TARGET_WORDS;

  return (
    <div className="wizard-step" data-step="3">
      <div className="field-row">
        <FormField
          id="start-date"
          label="Event Start Date"
          required
          type="date"
          min={todayIso}
          value={data.startDate}
          error={errors.startDate}
          onChange={ctrl.onStartDateChange}
          onBlur={() => ctrl.blurValidate("startDate", validateStartDate)}
        />
        <FormField
          id="start-time"
          label="Event Start Time"
          required
          type="time"
          value={data.startTime}
          error={errors.startTime}
          onChange={ctrl.onStartTimeChange}
          onBlur={() => ctrl.blurValidate("startTime", validateStartTime)}
        />
      </div>
      <div className="field-row">
        <FormField
          id="end-date"
          label="Event End Date"
          type="date"
          // Can't be earlier than the day the event starts. Worth having on the input itself:
          // validateEndTime only compares the two when an end TIME is also set, so an end date
          // before the start date would otherwise pass unnoticed.
          min={data.startDate || todayIso}
          value={data.endDate}
          error={errors.endDate}
          hint="Set to the start date — change it only for a multi-day event."
          onChange={ctrl.onEndDateChange}
          onBlur={() => ctrl.blurValidate("endDate", validateEndDate)}
        />
        <FormField
          id="end-time"
          label="Event End Time"
          type="time"
          value={data.endTime}
          error={errors.endTime}
          onChange={(v) => ctrl.updateAndMaybeValidate("endTime", v, "endTime", validateEndTime)}
          onBlur={() => ctrl.blurValidate("endTime", validateEndTime)}
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

      <div className="field-subhead">Key Speakers / Guests</div>
      <SpeakersEditor
        speakers={data.speakers}
        error={errors.speakers}
        onChange={(speakers) => ctrl.updateAndMaybeValidate("speakers", speakers, "speakers", validateSpeakers)}
        onBlurValidate={() => ctrl.blurValidate("speakers", validateSpeakers)}
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
