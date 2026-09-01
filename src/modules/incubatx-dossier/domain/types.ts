import type { IncubatxDossierOutput } from "@/lib/validation/incubatx-dossier";

/** Thrown for bad/missing input so the route can return 400 instead of 500. Carries per-field
 * messages so the client can map failures back to their field paths and reopen the earliest
 * step containing an error, per the brief's server-validation-failure requirement. */
export class IncubatxDossierValidationError extends Error {
  constructor(message: string, public readonly fieldErrors: Record<string, string>) {
    super(message);
  }
}

export interface IncubatxDossierRow {
  id: number;
  reference: string | null;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  submitted_at: string;
}

/** What the service needs beyond the validated form fields to persist and audit a submission. */
export interface IncubatxDossierSubmission {
  data: IncubatxDossierOutput;
  mobileIso: string;
  clientIpHash: string | null;
  userAgent: string | null;
}
