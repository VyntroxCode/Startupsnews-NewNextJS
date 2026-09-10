"use client";

import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { SponsorEventFormController } from "../useSponsorEventForm";
import { validateExternalUrl, validateLocation, validateSlug, validateTitle } from "../validation";

export function EventDetailsStep({ ctrl }: { ctrl: SponsorEventFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="sp-step" data-step="1">
      <p className="sp-step-kicker">01 EVENT</p>
      <h3 className="sp-step-heading">Start with the essentials.</h3>
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
      <FormField
        id="sp-location"
        label="Location (City & Country)"
        required
        value={data.location}
        error={errors.location}
        placeholder="e.g. Dubai, UAE"
        hint={
          data.location.trim() ? (
            <span className="sp-location-pulse">
              <span className="sp-preview-pulse" aria-hidden="true" />
              {data.location.trim()}
            </span>
          ) : undefined
        }
        onChange={(v) => ctrl.updateAndMaybeValidate("location", v, "location", validateLocation)}
        onBlur={() => ctrl.blurValidate("location", validateLocation)}
      />
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
      <div className="wizard-nav no-back">
        <Button variant="primary" className="sp-cta" onClick={ctrl.goNext}>
          <span>Next</span>
          <span className="sp-cta-arrow" aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}
