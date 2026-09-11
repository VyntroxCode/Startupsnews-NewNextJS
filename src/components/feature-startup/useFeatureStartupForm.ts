"use client";

import { useLeadForm, type LeadFormController } from "@/components/lead-forms/shared/useLeadForm";

// This page collects the shared engine's first two canonical validation steps (Details, then
// Contact & Location) on a single page. The engine's third canonical step is the pitch-deck
// upload, and it is deliberately not listed here: Feature Your Startup no longer asks for a
// document, so `pdfFile` is never set or validated on this page. The shared engine, its
// `LeadFormData` shape and `validatePdfFile` are untouched — Submit Your Funding Round and Submit
// Your Press Release both still collect a PDF and still run that step.
const FEATURE_STARTUP_STEP_GROUPS: number[][] = [[1, 2]];

export const TOTAL_STEPS = FEATURE_STARTUP_STEP_GROUPS.length;

/** The country-code select opens on India, exactly as /list-your-event's does — this page's
 * audience is majority Indian, and an unset code reads as one more thing to fill in. */
const FEATURE_STARTUP_INITIAL = { phoneCode: "+91" };

export function useFeatureStartupForm() {
  return useLeadForm("feature-startup", FEATURE_STARTUP_STEP_GROUPS, FEATURE_STARTUP_INITIAL);
}

export type FeatureStartupFormController = LeadFormController;
