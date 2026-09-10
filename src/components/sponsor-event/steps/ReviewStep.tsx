"use client";

import { useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/Button";
import type { SponsorEventFormController } from "../useSponsorEventForm";

function formatDate(value: string): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(value: string): string {
  if (!value) return "—";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function ReviewStep({ ctrl }: { ctrl: SponsorEventFormController }) {
  const { data, submitting, submitError } = ctrl;
  const turnstileRef = useRef<TurnstileInstance>(null);

  return (
    <div className="sp-step" data-step="4">
      <p className="sp-step-kicker">04 REVIEW</p>
      <h3 className="sp-step-heading">Your event is ready.</h3>

      {/* A visual summary of the submission only — not an actual ticket or registration pass. */}
      <div className="sp-review">
        {data.posterUrl && (
          <div className="sp-review-poster" style={{ backgroundImage: `url('${data.posterUrl}')` }} />
        )}
        <div className="sp-review-body">
          <p className="sp-review-brand">STARTUPNEWS.FYI · EVENT PARTNER</p>
          <p className="sp-review-event-title">{data.title || "—"}</p>
          <div className="sp-review-grid">
            <div className="sp-review-item">
              <span className="sp-review-label">Slug</span>
              <span className="sp-review-value">{data.slug || "—"}</span>
            </div>
            <div className="sp-review-item">
              <span className="sp-review-label">Location</span>
              <span className="sp-review-value">{data.location || "—"}</span>
            </div>
            <div className="sp-review-item">
              <span className="sp-review-label">Date &amp; Time</span>
              <span className="sp-review-value">
                {formatDate(data.date)} · {formatTime(data.time)}
              </span>
            </div>
            {data.externalUrl && (
              <div className="sp-review-item sp-review-item-wide">
                <span className="sp-review-label">External Link</span>
                <span className="sp-review-value sp-review-value-break">{data.externalUrl}</span>
              </div>
            )}
            <div className="sp-review-item sp-review-item-wide">
              <span className="sp-review-label">Description</span>
              <span className="sp-review-value sp-review-value-multiline">{data.description || "—"}</span>
            </div>
            <div className="sp-review-item">
              <span className="sp-review-label">Contact</span>
              <span className="sp-review-value">{data.contactName || "—"}</span>
            </div>
            <div className="sp-review-item">
              <span className="sp-review-label">Email</span>
              <span className="sp-review-value">{data.contactEmail || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="field sp-turnstile-field">
        <label>Security Verification *</label>
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          options={{ theme: "dark", size: "flexible" }}
          onSuccess={(token) => ctrl.setTurnstileToken(token)}
          onExpire={() => ctrl.setTurnstileToken(null)}
          onError={() => ctrl.setTurnstileToken(null)}
        />
      </div>

      {submitError && <div className="sp-submit-error">{submitError}</div>}

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack} disabled={submitting}>
          ← Edit Details
        </Button>
        <Button
          variant="primary"
          className="sp-cta"
          onClick={ctrl.submit}
          busy={submitting}
          busyLabel={<span>Sending to event desk…</span>}
          disabled={!ctrl.turnstileToken}
        >
          <span>Submit Event</span>
          <span className="sp-cta-arrow" aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}
