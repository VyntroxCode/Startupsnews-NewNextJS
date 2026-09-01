"use client";

import { motion } from "motion/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/Button";
import { RepeatableList } from "@/components/ui/RepeatableList";
import { GuidedDescriptionField } from "../GuidedDescriptionField";
import { fieldVariants } from "../motionVariants";
import { SECTOR_OPTIONS } from "@/lib/incubatx/sectors";
import { STAGES } from "../types";
import type { IncubatxDossierFormController } from "../useIncubatxDossierForm";

const STAGE_OPTIONS = STAGES.map((s) => ({ value: s, label: s }));

export function PositioningStep({ ctrl }: { ctrl: IncubatxDossierFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="ix-step" data-step="2">
      <div className="ix-step-head">
        <h2>Positioning</h2>
        <p>Where you sit in the market, and the story behind it.</p>
      </div>

      <motion.div variants={fieldVariants} className="field" id="field-stage">
        <label>Stage *</label>
        <CustomSelect
          options={STAGE_OPTIONS}
          value={data.stage}
          onChange={(v) => ctrl.setField("stage", v as typeof data.stage)}
          onBlurValidate={() => ctrl.blurValidate("stage")}
          ariaLabel="Startup stage"
          placeholder="Select stage"
        />
        <div className={"field-error" + (errors.stage ? " visible" : "")} aria-live="polite">{errors.stage}</div>
      </motion.div>

      <motion.div variants={fieldVariants} className="field" id="field-sector">
        <label>Industry / Sector *</label>
        <CustomSelect
          options={SECTOR_OPTIONS}
          value={data.sectorChoice}
          onChange={(v) => ctrl.setField("sectorChoice", v)}
          onBlurValidate={() => ctrl.blurValidate("sector")}
          ariaLabel="Sector"
          searchable
          placeholder="Select or search a sector"
        />
        {data.sectorChoice === "Other" && (
          <input
            type="text"
            placeholder="Type your sector"
            value={data.sectorOther}
            onChange={(e) => ctrl.setField("sectorOther", e.target.value)}
            onBlur={() => ctrl.blurValidate("sector")}
            style={{ marginTop: 8 }}
          />
        )}
        <div className={"field-error" + (errors.sector ? " visible" : "")} aria-live="polite">{errors.sector}</div>
      </motion.div>

      <motion.div variants={fieldVariants}>
        <label className="ix-list-label">LinkedIn Profile — Founders &amp; Startup *</label>
        <RepeatableList<string>
          fieldId="linkedin"
          items={data.linkedin}
          onChange={(v) => ctrl.setField("linkedin", v)}
          min={1}
          max={6}
          createRow={() => ""}
          addLabel="Add LinkedIn profile"
          removeTitle="Remove this profile"
          error={errors.linkedin}
          onBlurValidate={() => ctrl.blurValidate("linkedin")}
          renderRow={(url, idx, update) => (
            <input
              type="url"
              className="ix-row-input"
              placeholder="linkedin.com/in/username"
              value={url}
              onChange={(e) => update(e.target.value)}
              onBlur={() => ctrl.blurValidate("linkedin")}
            />
          )}
        />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <GuidedDescriptionField
          value={data.description}
          error={errors.description}
          onChange={(v) => ctrl.setField("description", v)}
          onBlur={() => ctrl.blurValidate("description")}
        />
      </motion.div>

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>Back</Button>
        <Button variant="primary" onClick={ctrl.goNext}>Next</Button>
      </div>
    </div>
  );
}
