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

export const DOSSIER_STATUSES = ["pending", "reviewed", "accepted", "rejected"] as const;
export type DossierStatus = (typeof DOSSIER_STATUSES)[number];

export function isDossierStatus(value: unknown): value is DossierStatus {
  return typeof value === "string" && (DOSSIER_STATUSES as readonly string[]).includes(value);
}

/** One row of the admin Grants list — only what the table shows. */
export interface DossierListItem {
  id: number;
  reference: string | null;
  status: DossierStatus;
  startupName: string;
  email: string;
  mobile: string;
  stage: string;
  sector: string;
  hasDpiit: boolean;
  submittedAt: string;
}

export interface DossierDocument {
  label: string;
  url: string | null;
  filename: string | null;
}

/** Everything a startup submitted, as the admin Grants drawer shows it. */
export interface DossierDetail extends DossierListItem {
  websiteUrl: string;
  mobileIso: string | null;
  founders: string[];
  linkedin: string[];
  description: string;
  marketOpportunity: string;
  businessModel: string;
  monthlyRevenue: number;
  annualRevenue: number;
  customerCount: number;
  revenueLastFy: number;
  hasRaised: boolean;
  totalFundingRaised: number | null;
  fullTimeCount: number;
  partTimeCount: number;
  documents: DossierDocument[];
  updatedAt: string;
}

export interface DossierListQuery {
  page: number;
  limit: number;
  search: string;
  status: DossierStatus | "";
}

export type DossierStatusCounts = Record<DossierStatus, number> & { total: number };
