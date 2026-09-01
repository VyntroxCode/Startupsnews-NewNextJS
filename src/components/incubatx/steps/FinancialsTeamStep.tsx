"use client";

import { AnimatePresence, motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { fieldVariants } from "../motionVariants";
import type { IncubatxDossierFormController } from "../useIncubatxDossierForm";

export function FinancialsTeamStep({ ctrl }: { ctrl: IncubatxDossierFormController }) {
  const { data, errors } = ctrl;

  return (
    <div className="ix-step" data-step="4">
      <div className="ix-step-head">
        <h2>Financials &amp; Team</h2>
        <p>Last year&apos;s numbers, funding so far, and who&apos;s building this.</p>
      </div>

      <motion.div variants={fieldVariants}>
        <MoneyInput
          id="revenue-last-fy"
          label="Revenue (Last Financial Year)"
          optionalHint="(₹)"
          required
          value={data.revenueLastFy}
          error={errors.revenueLastFy}
          onChange={(v) => ctrl.setField("revenueLastFy", v)}
          onBlur={() => ctrl.blurValidate("revenueLastFy")}
        />
      </motion.div>

      <motion.div variants={fieldVariants} className="field" id="field-has-raised">
        <label>Have you raised funding? *</label>
        <div className="ix-segmented">
          <button
            type="button"
            className={data.hasRaised === true ? "active" : ""}
            onClick={() => ctrl.setField("hasRaised", true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={data.hasRaised === false ? "active" : ""}
            onClick={() => ctrl.setFields({ hasRaised: false, totalFundingRaised: "" })}
          >
            No
          </button>
        </div>
        <div className={"field-error" + (errors.hasRaised ? " visible" : "")} aria-live="polite">{errors.hasRaised}</div>
      </motion.div>

      <AnimatePresence initial={false}>
        {data.hasRaised === true && (
          <motion.div
            key="total-funding-raised"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <MoneyInput
              id="total-funding-raised"
              label="Total Amount Raised"
              optionalHint="(₹)"
              required
              value={data.totalFundingRaised}
              error={errors.totalFundingRaised}
              onChange={(v) => ctrl.setField("totalFundingRaised", v)}
              onBlur={() => ctrl.blurValidate("totalFundingRaised")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fieldVariants}>
        <div className="ix-subhead">Total Team Size *</div>
        <div className="ix-field-row">
          <FormField
            id="full-time-count"
            label="Full-Time"
            inputMode="numeric"
            value={data.fullTimeCount}
            error={errors.fullTimeCount}
            onChange={(v) => ctrl.setField("fullTimeCount", v.replace(/\D/g, ""))}
            onBlur={() => ctrl.blurValidate("fullTimeCount")}
          />
          <FormField
            id="part-time-count"
            label="Part-Time"
            inputMode="numeric"
            value={data.partTimeCount}
            error={errors.partTimeCount}
            onChange={(v) => ctrl.setField("partTimeCount", v.replace(/\D/g, ""))}
            onBlur={() => ctrl.blurValidate("fullTimeCount")}
          />
        </div>
      </motion.div>

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>Back</Button>
        <Button variant="primary" onClick={ctrl.goNext}>Next</Button>
      </div>
    </div>
  );
}
