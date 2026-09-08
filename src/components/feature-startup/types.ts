// Re-exports the shared lead-form data shape (see src/components/lead-forms/shared/types.ts) under
// this page's original names, so nothing else in this folder has to change.
export type {
  LeadFormData as FeatureStartupFormData,
  FieldErrors,
} from "@/components/lead-forms/shared/types";
export { createInitialLeadFormData as createInitialFormData } from "@/components/lead-forms/shared/types";
