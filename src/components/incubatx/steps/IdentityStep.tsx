"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { RepeatableList } from "@/components/ui/RepeatableList";
import { fieldVariants } from "../motionVariants";
import type { IncubatxDossierFormController } from "../useIncubatxDossierForm";

export function IdentityStep({ ctrl }: { ctrl: IncubatxDossierFormController }) {
  const { data, errors } = ctrl;
  return (
    <div className="ix-step" data-step="1">
      <div className="ix-step-head">
        <h2>Identity</h2>
        <p>The basics — who you are and how we reach you.</p>
      </div>

      <motion.div variants={fieldVariants}>
        <FormField
          id="startup-name"
          label="Startup Name"
          required
          value={data.startupName}
          error={errors.startupName}
          onChange={(v) => ctrl.setField("startupName", v)}
          onBlur={() => ctrl.blurValidate("startupName")}
        />
      </motion.div>
      <motion.div variants={fieldVariants}>
        <FormField
          id="website-url"
          label="Website URL"
          required
          type="url"
          placeholder="example.com"
          value={data.websiteUrl}
          error={errors.websiteUrl}
          onChange={(v) => ctrl.setField("websiteUrl", v)}
          onBlur={() => ctrl.blurValidate("websiteUrl")}
        />
      </motion.div>
      <motion.div variants={fieldVariants} className="ix-field-row">
        <FormField
          id="email"
          label="Startup Email ID"
          required
          type="email"
          value={data.email}
          error={errors.email}
          onChange={(v) => ctrl.setField("email", v)}
          onBlur={() => ctrl.blurValidate("email")}
        />
        <PhoneField
          id="mobile"
          label="Mobile Number"
          required
          phoneCode={data.phoneCode}
          phoneCodeCustom={data.phoneCodeCustom}
          phoneNumber={data.mobile}
          error={errors.mobile}
          onChangeCode={(v) => ctrl.setField("phoneCode", v)}
          onChangeCustomCode={(v) => ctrl.setField("phoneCodeCustom", v)}
          onChangeNumber={(v) => ctrl.setField("mobile", v)}
          onBlurValidate={() => ctrl.blurValidate("mobile")}
        />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <label className="ix-list-label">Founder / Co-founder Name *</label>
        <RepeatableList<string>
          fieldId="founders"
          items={data.founders}
          onChange={(v) => ctrl.setField("founders", v)}
          min={1}
          max={6}
          createRow={() => ""}
          addLabel="Add founder"
          removeTitle="Remove this founder"
          error={errors.founders}
          onBlurValidate={() => ctrl.blurValidate("founders")}
          renderRow={(name, idx, update) => (
            <input
              type="text"
              className="ix-row-input"
              placeholder={`Founder ${idx + 1} name`}
              value={name}
              onChange={(e) => update(e.target.value)}
              onBlur={() => ctrl.blurValidate("founders")}
            />
          )}
        />
      </motion.div>

      <div className="wizard-nav no-back">
        <Button variant="primary" onClick={ctrl.goNext}>Next</Button>
      </div>
    </div>
  );
}
