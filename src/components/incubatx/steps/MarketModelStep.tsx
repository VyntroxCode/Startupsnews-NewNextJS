"use client";

import { motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { fieldVariants } from "../motionVariants";
import type { IncubatxDossierFormController } from "../useIncubatxDossierForm";

export function MarketModelStep({ ctrl }: { ctrl: IncubatxDossierFormController }) {
  const { data, errors, softWarnings } = ctrl;

  return (
    <div className="ix-step" data-step="3">
      <div className="ix-step-head">
        <h2>Market &amp; Model</h2>
        <p>The opportunity, how you make money, and where traction stands today.</p>
      </div>

      <motion.div variants={fieldVariants}>
        <FormField
          id="market-opportunity"
          label="Market Opportunity"
          required
          type="textarea"
          rows={4}
          value={data.marketOpportunity}
          error={errors.marketOpportunity}
          onChange={(v) => ctrl.setField("marketOpportunity", v)}
          onBlur={() => ctrl.blurValidate("marketOpportunity")}
        />
      </motion.div>
      <motion.div variants={fieldVariants}>
        <FormField
          id="business-model"
          label="Business Model (Revenue Model)"
          required
          type="textarea"
          rows={4}
          value={data.businessModel}
          error={errors.businessModel}
          onChange={(v) => ctrl.setField("businessModel", v)}
          onBlur={() => ctrl.blurValidate("businessModel")}
        />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <div className="ix-subhead">Traction *</div>
        {softWarnings.stage && <div className="ix-soft-warning">{softWarnings.stage}</div>}
        <div className="ix-field-row-3">
          <MoneyInput
            id="monthly-revenue"
            label="Monthly Revenue"
            optionalHint="(₹)"
            value={data.monthlyRevenue}
            error={errors.monthlyRevenue}
            onChange={(v) => ctrl.setField("monthlyRevenue", v)}
            onBlur={() => ctrl.blurValidate("monthlyRevenue")}
          />
          <MoneyInput
            id="annual-revenue"
            label="Annual Revenue"
            optionalHint="(₹)"
            value={data.annualRevenue}
            error={errors.annualRevenue}
            onChange={(v) => ctrl.setField("annualRevenue", v)}
            onBlur={() => ctrl.blurValidate("annualRevenue")}
          />
          <FormField
            id="customer-count"
            label="Customers / Users"
            inputMode="numeric"
            value={data.customerCount}
            error={errors.customerCount}
            onChange={(v) => ctrl.setField("customerCount", v.replace(/[^\d,]/g, ""))}
            onBlur={() => ctrl.blurValidate("customerCount")}
          />
        </div>
        {softWarnings.annualRevenue && <div className="ix-soft-warning">{softWarnings.annualRevenue}</div>}
      </motion.div>

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>Back</Button>
        <Button variant="primary" onClick={ctrl.goNext}>Next</Button>
      </div>
    </div>
  );
}
