"use client";

import { useLeadForm, type LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { resolveCity, resolveCountry } from "@/components/lead-forms/shared/compose";
import type { LeadFormData } from "@/components/lead-forms/shared/types";

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

/** Saves the submission to `feature_startup_submissions`, which the admin Sales Tracker lists
 * under its "Feature Your Startup" KPI card. Country and city are sent separately and already
 * resolved (the picked value, or what was typed under "Other"), so the admin edit form can reopen
 * them in the same dropdowns. Throwing keeps the form on screen with the message shown. */
async function submitFeatureStartup(data: LeadFormData): Promise<void> {
  const res = await fetch("/api/feature-your-startup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name.trim(),
      companyName: data.companyName.trim(),
      phone: data.phone,
      email: data.email.trim(),
      website: data.website.trim(),
      country: resolveCountry(data),
      city: resolveCity(data),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error((json && typeof json.error === "string" && json.error) || "We couldn't submit your details. Please try again.");
  }
}

export function useFeatureStartupForm() {
  return useLeadForm("feature-startup", FEATURE_STARTUP_STEP_GROUPS, FEATURE_STARTUP_INITIAL, submitFeatureStartup);
}

export type FeatureStartupFormController = LeadFormController;
