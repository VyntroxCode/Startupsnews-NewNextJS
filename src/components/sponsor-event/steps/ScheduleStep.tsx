"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { SponsorEventFormController } from "../useSponsorEventForm";
import { validateDate, validateDescription, validateTime } from "../validation";

export function ScheduleStep({ ctrl }: { ctrl: SponsorEventFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="sp-step" data-step="2">
      <p className="sp-step-kicker">02 SCHEDULE</p>
      <h3 className="sp-step-heading">When does it happen?</h3>
      <div className="sp-field-row">
        <div className="sp-numbered-field">
          <span className="sp-numbered-field-n">01</span>
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
        </div>
        <div className="sp-numbered-field">
          <span className="sp-numbered-field-n">02</span>
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
      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>
          Back
        </Button>
        <Button variant="primary" className="sp-cta" onClick={ctrl.goNext}>
          <span>Next</span>
          <span className="sp-cta-arrow" aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}
