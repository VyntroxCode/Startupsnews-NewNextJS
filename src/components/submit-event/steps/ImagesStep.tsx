"use client";

import { ImageUploadField } from "../ImageUploadField";
import { SocialImagesSection } from "../SocialImagesSection";
import { IMAGE_SPECS } from "../constants";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SOCIAL_LINK_VALIDATORS } from "../validation";
import { SOCIAL_LINK_FIELDS, SOCIAL_LINK_MAX_LENGTH } from "@/modules/partnership-events/domain/types";
import type { SubmitEventFormController } from "../useSubmitEventForm";

export function ImagesStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, errors } = ctrl;

  return (
    <div className="wizard-step" data-step="4">
      <ImageUploadField
        id="1"
        label="Cover Image"
        required
        spec={IMAGE_SPECS.cover}
        exactSize
        value={data.image1}
        filename={data.image1Filename}
        error={errors.image1}
        onAccept={(url, filename) => {
          ctrl.setFields({ image1: url, image1Filename: filename });
          ctrl.setFieldError("image1", "");
        }}
        onClear={() => {
          ctrl.setFields({ image1: "", image1Filename: "" });
          ctrl.clearFieldError("image1");
        }}
        onError={(msg) => {
          if (msg) ctrl.setFields({ image1: "", image1Filename: "" });
          ctrl.setFieldError("image1", msg);
        }}
      />
      <ImageUploadField
        id="3"
        label="Banner Image"
        spec={IMAGE_SPECS.banner}
        exactSize
        value={data.image3}
        filename={data.image3Filename}
        error={errors.image3}
        onAccept={(url, filename) => {
          ctrl.setFields({ image3: url, image3Filename: filename });
          ctrl.setFieldError("image3", "");
        }}
        onClear={() => {
          ctrl.setFields({ image3: "", image3Filename: "" });
          ctrl.clearFieldError("image3");
        }}
        onError={(msg) => {
          if (msg) ctrl.setFields({ image3: "", image3Filename: "" });
          ctrl.setFieldError("image3", msg);
        }}
      />
      <SocialImagesSection
        socialImages={data.socialImages}
        onChange={(socialImages) => ctrl.setField("socialImages", socialImages)}
      />
      <div className="field">
        <label>
          Social Media Links<span className="opt"> (optional)</span>
        </label>
        <div className="hint">Add links to the accounts you have — leave the rest blank.</div>
      </div>
      <div className="field-row">
        {SOCIAL_LINK_FIELDS.map(({ key, label, placeholder }) => (
          <FormField
            key={key}
            id={key}
            label={label}
            type="url"
            inputMode="url"
            placeholder={placeholder}
            maxLength={SOCIAL_LINK_MAX_LENGTH}
            value={data[key]}
            error={errors[key]}
            onChange={(v) => ctrl.updateAndMaybeValidate(key, v, key, SOCIAL_LINK_VALIDATORS[key])}
            onBlur={() => ctrl.blurValidate(key, SOCIAL_LINK_VALIDATORS[key])}
          />
        ))}
      </div>
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
