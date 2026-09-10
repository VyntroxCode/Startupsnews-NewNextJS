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

export function useFeatureStartupForm() {
  return useLeadForm("feature-startup", FEATURE_STARTUP_STEP_GROUPS);
}

export type FeatureStartupFormController = LeadFormController;
