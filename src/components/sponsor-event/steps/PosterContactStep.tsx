"use client";

import { useRef, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { ALLOWED_IMAGE_ACCEPT, ALLOWED_IMAGE_ERROR, ALLOWED_IMAGE_LABEL } from "@/components/submit-event/constants";
import { compressImage, isAllowedImageFile, uploadFileToS3 } from "@/components/submit-event/imageUpload";
import type { SponsorEventFormController } from "../useSponsorEventForm";
import { validateContactEmail, validateContactName, validatePhone, validatePoster } from "../validation";

// The Google Form this page replaces capped the poster at 10MB — stricter than the 20MB hard
// ceiling shared imageUpload.ts otherwise applies, so it's enforced here rather than there.
const MAX_POSTER_BYTES = 10 * 1024 * 1024;

export function PosterContactStep({ ctrl }: { ctrl: SponsorEventFormController }) {
  const { data, errors } = ctrl;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!isAllowedImageFile(file)) {
      ctrl.blurValidate("posterUrl", () => ALLOWED_IMAGE_ERROR);
      return;
    }
    if (file.size > MAX_POSTER_BYTES) {
      ctrl.blurValidate("posterUrl", () => "This image is larger than 10MB. Please use a smaller file.");
      return;
    }
    setBusy(true);
    try {
      const toUpload = await compressImage(file);
      const fileUrl = await uploadFileToS3(toUpload);
      ctrl.setField("posterUrl", fileUrl);
      ctrl.setField("posterFilename", file.name);
      if (errors.posterUrl) ctrl.blurValidate("posterUrl", validatePoster);
    } catch (err) {
      ctrl.blurValidate("posterUrl", () => (err instanceof Error ? err.message : "Couldn't upload this image. Please try again."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clearPoster() {
    ctrl.setField("posterUrl", "");
    ctrl.setField("posterFilename", "");
  }

  return (
    <div className="sp-step" data-step="3">
      <p className="sp-step-kicker">Contact</p>
      <h3 className="sp-step-heading">Give Your Event A Face.</h3>
      <div className={"field sp-upload-field" + (errors.posterUrl ? " has-error" : "")}>
        <label>Event Poster *</label>
        <div
          className={"sp-upload-zone" + (dragging ? " drag" : "") + (errors.posterUrl ? " has-error" : "") + (data.posterUrl ? " has-image" : "")}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {data.posterUrl ? (
            <div className="sp-upload-preview" style={{ backgroundImage: `url('${data.posterUrl}')` }} />
          ) : (
            <>
              <span className="sp-upload-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v13" />
                  <path d="M7 8l5-5 5 5" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </span>
              <p className="sp-upload-title">{busy ? "Uploading…" : dragging ? "Drop poster here" : "Drop your event poster here"}</p>
              <p className="sp-upload-hint">
                {ALLOWED_IMAGE_LABEL}, max 10MB · or browse files
              </p>
            </>
          )}
        </div>
        {data.posterUrl && (
          <div className="sp-upload-file">
            <span>{data.posterFilename || "Poster Uploaded"}</span>
            <button type="button" aria-label="Remove poster" onClick={clearPoster}>
              &times;
            </button>
          </div>
        )}
        <div className={"field-error" + (errors.posterUrl ? " visible" : "")} aria-live="polite">
          {errors.posterUrl}
        </div>
      </div>

      <p className="sp-group-label">EVENT CONTACT</p>
      <FormField
        id="sp-contact-name"
        label="Your Name"
        required
        value={data.contactName}
        error={errors.contactName}
        onChange={(v) => ctrl.updateAndMaybeValidate("contactName", v, "contactName", validateContactName)}
        onBlur={() => ctrl.blurValidate("contactName", validateContactName)}
      />
      <FormField
        id="sp-contact-email"
        label="Your Email"
        required
        type="email"
        hint="Someone from our team may reach out to confirm the details."
        value={data.contactEmail}
        error={errors.contactEmail}
        onChange={(v) => ctrl.updateAndMaybeValidate("contactEmail", v, "contactEmail", validateContactEmail)}
        onBlur={() => ctrl.blurValidate("contactEmail", validateContactEmail)}
      />
      {/* New on this form — the API had no phone field at all, so the route was extended to carry
          it into the notification email rather than letting it be collected and dropped. */}
      <PhoneField
        id="sp-phone"
        label="Phone / WhatsApp"
        phoneCode={data.phoneCode}
        phoneCodeCustom={data.phoneCodeCustom}
        phoneNumber={data.phoneNumber}
        error={errors.phone}
        onChangeCode={(v) => ctrl.updateAndMaybeValidate("phoneCode", v, "phone", validatePhone)}
        onChangeCustomCode={(v) =>
          ctrl.updateAndMaybeValidate("phoneCodeCustom", v, "phone", validatePhone)
        }
        onChangeNumber={(v) => ctrl.updateAndMaybeValidate("phoneNumber", v, "phone", validatePhone)}
        onBlurValidate={() => ctrl.blurValidate("phone", validatePhone)}
      />

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>
          Back
        </Button>
        <Button variant="primary" className="sp-cta" onClick={ctrl.goNext} disabled={busy}>
          <span>Next</span>
          <span className="sp-cta-arrow" aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}
