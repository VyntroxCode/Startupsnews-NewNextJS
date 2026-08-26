"use client";

import { SOCIAL_PLATFORMS } from "../constants";
import { formatConfirmDate } from "../format";
import type { SubmitEventFormController } from "../useSubmitEventForm";
import { resolveEndDateTime, resolvedCity, resolvedCountry, resolvedPhoneCode, countWords } from "../validation";

export function ReviewStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, submitting, submitError } = ctrl;

  const city = resolvedCity(data);
  const country = resolvedCountry(data);
  const locationText =
    country === "India" ? `India${city ? " · " + city : ""}` : `International${country ? " · " + country : ""}${city ? " · " + city : ""}`;

  const { endDate, endTime } = resolveEndDateTime(data);
  const wordCount = countWords(data.description);
  const speakerCount = data.speakers.filter((s) => s.name.trim()).length;
  const socialCount = SOCIAL_PLATFORMS.reduce((sum, p) => sum + (data.socialImages[`social-${p.slot}`]?.length || 0), 0);
  const phoneDigits = data.phoneNumber.replace(/\D/g, "");

  return (
    <div className="wizard-step" data-step="5">
      <div className="subhead">Review &amp; Submit</div>

      <div className="review-group">
        <div className="review-group-head">
          <span className="review-group-title">Organizer Contact</span>
          <button type="button" className="review-edit-btn" onClick={() => ctrl.goToStep(1)}>
            Edit
          </button>
        </div>
        <div className="confirm-summary review">
          <div className="row"><span className="k">Name</span><span className="v">{data.organizerName || "—"}</span></div>
          <div className="row"><span className="k">Company</span><span className="v">{data.organizerOrg || "—"}</span></div>
          <div className="row"><span className="k">e-mail</span><span className="v">{data.organizerEmail || "—"}</span></div>
          <div className="row"><span className="k">Phone</span><span className="v">{phoneDigits ? `${resolvedPhoneCode(data)} ${phoneDigits}` : "—"}</span></div>
        </div>
      </div>

      <div className="review-group">
        <div className="review-group-head">
          <span className="review-group-title">Event Basics</span>
          <button type="button" className="review-edit-btn" onClick={() => ctrl.goToStep(2)}>
            Edit
          </button>
        </div>
        <div className="confirm-summary review">
          <div className="row"><span className="k">Title</span><span className="v">{data.title || "—"}</span></div>
          <div className="row"><span className="k">Location</span><span className="v">{locationText}</span></div>
          <div className="row"><span className="k">Registration Link</span><span className="v">{data.externalUrl || "—"}</span></div>
          <div className="row"><span className="k">Event Type</span><span className="v">{data.eventType || "—"}</span></div>
          <div className="row"><span className="k">Description</span><span className="v">{wordCount ? `${wordCount} words` : "—"}</span></div>
        </div>
      </div>

      <div className="review-group">
        <div className="review-group-head">
          <span className="review-group-title">Date, Time, Venue &amp; Speakers</span>
          <button type="button" className="review-edit-btn" onClick={() => ctrl.goToStep(3)}>
            Edit
          </button>
        </div>
        <div className="confirm-summary review">
          <div className="row"><span className="k">Starts</span><span className="v">{data.startDate ? `${formatConfirmDate(data.startDate)} · ${data.startTime || "—"}` : "—"}</span></div>
          <div className="row"><span className="k">Ends</span><span className="v">{data.startDate ? `${formatConfirmDate(endDate)} · ${endTime}` : "—"}</span></div>
          <div className="row"><span className="k">Venue</span><span className="v">{data.venueAddress || "—"}</span></div>
          <div className="row"><span className="k">Speakers/Guests</span><span className="v">{speakerCount ? `${speakerCount} added` : "—"}</span></div>
        </div>
      </div>

      <div className="review-group">
        <div className="review-group-head">
          <span className="review-group-title">Images</span>
          <button type="button" className="review-edit-btn" onClick={() => ctrl.goToStep(4)}>
            Edit
          </button>
        </div>
        <div className="confirm-summary review">
          <div className="row">
            <span className="k">Attached</span>
            <span className="v">
              Cover {data.image1 ? "✓" : "✗"} · Banner {data.image3 ? "✓" : "✗"} · {socialCount} social image
              {socialCount === 1 ? "" : "s"} added
            </span>
          </div>
        </div>
      </div>

      {submitError ? <div className="error-text">{submitError}</div> : null}

      <div className="wizard-nav">
        <button type="button" className="btn-ghost" onClick={ctrl.goBack} disabled={submitting}>
          Back
        </button>
        <div className="submit-row">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              ctrl.submit();
            }}
          >
            {submitting ? "Submitting…" : "Submit event"}
          </button>
        </div>
      </div>
    </div>
  );
}
