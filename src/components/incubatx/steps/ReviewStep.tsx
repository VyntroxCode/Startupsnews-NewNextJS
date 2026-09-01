"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { fieldVariants } from "../motionVariants";
import { resolvedSector, type IncubatxFileRef } from "../types";
import type { IncubatxDossierFormController } from "../useIncubatxDossierForm";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="ix-review-row">
      <span className="k">{k}</span>
      <span className="v">{v || "—"}</span>
    </div>
  );
}

function docLabel(f: IncubatxFileRef | null): string {
  return f ? f.filename : "Not provided";
}

export function ReviewStep({ ctrl }: { ctrl: IncubatxDossierFormController }) {
  const { data, submitting, submitError } = ctrl;
  const sector = resolvedSector(data);
  const phone = `${data.phoneCode === "other" ? data.phoneCodeCustom : data.phoneCode} ${data.mobile}`;

  return (
    <div className="ix-step ix-review" data-step="review">
      <div className="ix-step-head">
        <h2>Review &amp; submit</h2>
        <p>Check the details below — every section links back to the step that owns it.</p>
      </div>

      <motion.section variants={fieldVariants} className="ix-review-section">
        <div className="ix-review-section-head">
          <h3>Identity</h3>
          <button type="button" className="ix-edit-link" onClick={() => ctrl.goToStep(1)}>Edit</button>
        </div>
        <Row k="Startup Name" v={data.startupName} />
        <Row k="Website" v={data.websiteUrl} />
        <Row k="Email" v={data.email} />
        <Row k="Mobile" v={phone} />
        <Row k="Founders" v={data.founders.filter(Boolean).join(", ")} />
      </motion.section>

      <motion.section variants={fieldVariants} className="ix-review-section">
        <div className="ix-review-section-head">
          <h3>Positioning</h3>
          <button type="button" className="ix-edit-link" onClick={() => ctrl.goToStep(2)}>Edit</button>
        </div>
        <Row k="Stage" v={data.stage} />
        <Row k="Sector" v={sector} />
        <Row k="LinkedIn" v={data.linkedin.filter(Boolean).join(", ")} />
        <Row k="Description" v={data.description ? `${data.description.slice(0, 140)}${data.description.length > 140 ? "…" : ""}` : ""} />
      </motion.section>

      <motion.section variants={fieldVariants} className="ix-review-section">
        <div className="ix-review-section-head">
          <h3>Market &amp; Model</h3>
          <button type="button" className="ix-edit-link" onClick={() => ctrl.goToStep(3)}>Edit</button>
        </div>
        <Row k="Market Opportunity" v={data.marketOpportunity ? `${data.marketOpportunity.slice(0, 140)}${data.marketOpportunity.length > 140 ? "…" : ""}` : ""} />
        <Row k="Business Model" v={data.businessModel ? `${data.businessModel.slice(0, 140)}${data.businessModel.length > 140 ? "…" : ""}` : ""} />
        <Row k="Monthly Revenue" v={data.monthlyRevenue ? `₹${data.monthlyRevenue}` : ""} />
        <Row k="Annual Revenue" v={data.annualRevenue ? `₹${data.annualRevenue}` : ""} />
        <Row k="Customers / Users" v={data.customerCount} />
      </motion.section>

      <motion.section variants={fieldVariants} className="ix-review-section">
        <div className="ix-review-section-head">
          <h3>Financials &amp; Team</h3>
          <button type="button" className="ix-edit-link" onClick={() => ctrl.goToStep(4)}>Edit</button>
        </div>
        <Row k="Revenue (Last FY)" v={data.revenueLastFy ? `₹${data.revenueLastFy}` : ""} />
        <Row k="Raised Funding" v={data.hasRaised === null ? "" : data.hasRaised ? `Yes — ₹${data.totalFundingRaised}` : "No"} />
        <Row k="Team Size" v={data.fullTimeCount || data.partTimeCount ? `${data.fullTimeCount || 0} full-time, ${data.partTimeCount || 0} part-time` : ""} />
      </motion.section>

      <motion.section variants={fieldVariants} className="ix-review-section">
        <div className="ix-review-section-head">
          <h3>Documents</h3>
          <button type="button" className="ix-edit-link" onClick={() => ctrl.goToStep(5)}>Edit</button>
        </div>
        <Row k="Company Profile" v={docLabel(data.companyProfile)} />
        <Row k="Certificate of Incorporation" v={docLabel(data.incorporationCert)} />
        <Row k="DPIIT Certificate" v={docLabel(data.dpiitCert)} />
        <Row k="State Startup Certificate" v={docLabel(data.stateStartupCert)} />
        <Row k="GST Certificate" v={docLabel(data.gstCert)} />
      </motion.section>

      {submitError ? <div className="error-text">{submitError}</div> : null}

      {/* Honeypot — real users never see this; a bot filling every field trips it. */}
      <input
        type="text"
        name="website_hp"
        value={data.website_hp}
        onChange={(e) => ctrl.setField("website_hp", e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="ix-honeypot"
        aria-hidden="true"
      />

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack} disabled={submitting}>Back</Button>
        <Button variant="primary" disabled={submitting} busy={submitting} busyLabel="Submitting…" onClick={ctrl.submit}>
          Submit dossier
        </Button>
      </div>
    </div>
  );
}
