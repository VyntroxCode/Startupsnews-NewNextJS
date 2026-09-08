"use client";

import { useLeadForm, LEAD_FORM_TOTAL_STEPS, type LeadFormController } from "@/components/lead-forms/shared/useLeadForm";

export const TOTAL_STEPS = LEAD_FORM_TOTAL_STEPS;

export function useFeatureStartupForm() {
  return useLeadForm("feature-startup");
}

export type FeatureStartupFormController = LeadFormController;
