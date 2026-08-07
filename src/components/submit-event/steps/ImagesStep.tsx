"use client";

import { ImageUploadField } from "../ImageUploadField";
import { SocialImagesSection } from "../SocialImagesSection";
import { IMAGE_SPECS } from "../constants";
import type { SubmitEventFormController } from "../useSubmitEventForm";

export function ImagesStep({ ctrl }: { ctrl: SubmitEventFormController }) {
  const { data, errors } = ctrl;

  return (
    <div className="wizard-step" data-step="4">
      <div className="subhead">Images</div>
      <ImageUploadField
        id="1"
        label="Cover Image"
        required
        spec={IMAGE_SPECS.cover}
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
