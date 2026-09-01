import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { isDisposableEmailDomain } from "./disposable-domains";
import { parseIndianShorthand } from "@/lib/format/indian-number";
import { COUNTRY_CODE_OPTIONS } from "@/components/ui/constants/phone";

export const stages = ["Idea", "Prototype", "MVP", "Early Revenue", "Growth Stage"] as const;

// ---------------------------------------------------------------------------
// Normalization helpers — run before validation so the stored value is clean.
// ---------------------------------------------------------------------------

function stripZeroWidth(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function collapseWhitespace(s: string): string {
  return stripZeroWidth(s).trim().replace(/\s+/g, " ");
}

function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

function isOnlyUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

/** True once whitespace is stripped and fewer than 3 distinct characters remain across a text
 * long enough that repetition, not brevity, is the explanation ("aaaaaaaaaa..."). */
function isRepeatedChars(s: string): boolean {
  const compact = s.replace(/\s+/g, "");
  if (compact.length < 10) return false;
  return new Set(compact.toLowerCase()).size <= 2;
}

function normalizeUrlString(raw: string): string {
  let s = collapseWhitespace(raw);
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    u.hostname = u.hostname.toLowerCase();
    for (const key of Array.from(u.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_") || key === "fbclid" || key === "gclid") u.searchParams.delete(key);
    }
    let out = u.toString();
    if (out.endsWith("/") && !out.endsWith("://")) out = out.slice(0, -1);
    return out;
  } catch {
    return s;
  }
}

// ---------------------------------------------------------------------------
// Field factories
// ---------------------------------------------------------------------------

function nameString(min: number, max: number, requireLetter = false) {
  return z.preprocess(
    (v) => (typeof v === "string" ? collapseWhitespace(v) : v),
    z.string()
      .min(min, `Enter at least ${min} characters.`)
      .max(max, `Keep it to ${max} characters or fewer.`)
      .refine((s) => !requireLetter || /[a-zA-Z]/.test(s), { message: "Must contain at least one letter." })
  );
}

/** A single founder/team-member name — letters (incl. Unicode), spaces, `.`, `'`, `-` only. */
function personName() {
  return z.preprocess(
    (v) => (typeof v === "string" ? collapseWhitespace(v) : v),
    z.string()
      .min(2, "Enter at least 2 characters.")
      .max(80, "Keep it to 80 characters or fewer.")
      .refine((s) => !/\d/.test(s), { message: "Names shouldn't contain digits." })
      .refine((s) => /^[\p{L}\s.'-]+$/u.test(s), { message: "Use letters, spaces, and . ' - only." })
  );
}

function noDuplicates(items: string[], ctx: z.RefinementCtx, itemNoun: string) {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const key = item.trim().toLowerCase();
    if (key && seen.has(key)) {
      ctx.addIssue({ code: "custom", message: `You've already added this ${itemNoun}.`, path: [i] });
    }
    seen.add(key);
  });
}

function normalizedUrl(maxLen = 2048) {
  return z.preprocess(
    (v) => (typeof v === "string" ? normalizeUrlString(v) : v),
    z.string()
      .max(maxLen, "That link is too long.")
      .refine(
        (s) => {
          try {
            const u = new URL(s);
            if (!/^https?:$/.test(u.protocol)) return false;
            if (u.hostname === "localhost") return false;
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) return false;
            if (!/\.[a-zA-Z]{2,}$/.test(u.hostname)) return false;
            return true;
          } catch {
            return false;
          }
        },
        { message: "That doesn't look like a website address — try example.com." }
      )
  );
}

function linkedinUrl() {
  return z.preprocess(
    (v) => (typeof v === "string" ? normalizeUrlString(v) : v),
    z.string().refine(
      (s) => {
        try {
          const u = new URL(s);
          if (!/^https?:$/.test(u.protocol)) return false;
          if (!/^([a-z]{2}\.)?(www\.)?linkedin\.com$/i.test(u.hostname)) return false;
          if (!/^\/(in|company|school)\//i.test(u.pathname)) return false;
          return true;
        } catch {
          return false;
        }
      },
      { message: "Use a full LinkedIn profile or company URL, like linkedin.com/in/username." }
    )
  );
}

/** 200-5000 chars + a word-count floor + rejects link-only or repeated-character junk. */
function longText(min: number, max: number, minWords: number, label: string) {
  return z.preprocess(
    (v) => (typeof v === "string" ? collapseWhitespace(v) : v),
    z.string()
      .min(min, min === 200 ? "Give us at least a couple of paragraphs — this is the section grant reviewers read first." : `${label} needs at least ${min} characters.`)
      .max(max, `${label} is capped at ${max} characters.`)
      .refine((s) => countWords(s) >= minWords, { message: `${label} needs at least ${minWords} words.` })
      .refine((s) => !isOnlyUrl(s), { message: `${label} can't be just a link.` })
      .refine((s) => !isRepeatedChars(s), { message: `${label} needs real content, not repeated characters.` })
  );
}

/**
 * Indian-shorthand money ("4.5L", "2Cr", "50K", "4,50,000") -> integer rupees, 0 to `max`.
 * `allowEmpty` (for the one genuinely optional money field, totalFundingRaised) maps a blank
 * string to `undefined` so `.optional()` accepts it. Everywhere else blank maps to `NaN`, which
 * still passes z.number()'s own type check (NaN is type "number") so our `.refine` below — not
 * zod's generic "expected number, received undefined" — produces the friendly required message.
 */
function money(max = 1e12, { allowEmpty = false }: { allowEmpty?: boolean } = {}) {
  return z.preprocess(
    (v) => {
      if (typeof v === "number") return v;
      if (typeof v !== "string" || v.trim() === "") return allowEmpty ? undefined : NaN;
      const n = parseIndianShorthand(v);
      return n === null ? NaN : n;
    },
    z.number()
      .refine((n) => Number.isFinite(n), { message: "Enter a valid amount." })
      .refine((n) => Number.isInteger(n), { message: "Enter a whole rupee amount." })
      .min(0, "Must be zero or more.")
      .max(max, "That figure looks too large — double-check it.")
  );
}

function count(max: number) {
  return z.preprocess(
    (v) => {
      if (typeof v === "number") return v;
      if (typeof v !== "string" || v.trim() === "") return NaN;
      const cleaned = v.replace(/,/g, "").trim();
      const n = Number(cleaned);
      return Number.isFinite(n) ? Math.round(n) : NaN;
    },
    z.number()
      .refine((n) => Number.isFinite(n), { message: "Enter a valid number." })
      .min(0, "Must be zero or more.")
      .max(max, "That number looks too large.")
  );
}

function fileRef() {
  return z.object({
    url: z.string().min(1),
    filename: z.string().min(1),
    size: z.number().int().positive(),
    mimeType: z.string().min(1),
  });
}

/** A required file: `undefined`/`null` must still produce `requiredMessage`, not zod's generic
 * "expected object, received undefined" — mapping the missing value to explicit `null` first
 * (via `.nullable()`) lets the base type-check pass, so the `.refine` below actually runs. */
function requiredFileRef(requiredMessage: string) {
  return z
    .preprocess((v) => v ?? null, fileRef().nullable())
    .refine((v) => v !== null, { message: requiredMessage });
}

/** +91 / "other"+custom-code -> the 2-letter ISO libphonenumber-js needs. Empty for an
 * unrecognized custom code — validatePhoneWithIso falls back to a length check in that case. */
export function resolveMobileIso(phoneCode: string, phoneCodeCustom: string): string {
  const opt = COUNTRY_CODE_OPTIONS.find((c) => c.code === phoneCode);
  if (opt && opt.iso) return opt.iso.toUpperCase();
  void phoneCodeCustom;
  return "";
}

// ---------------------------------------------------------------------------
// Field shapes — extracted so both the full schema (server-side, final authority) and the
// per-step schemas (client-side, incremental) validate identical rules without duplication.
// ---------------------------------------------------------------------------

const fieldShapes = {
  startupName: nameString(2, 120, true),
  websiteUrl: normalizedUrl(),
  email: z
    .preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email("Enter a valid email — we send grant updates here.").max(254))
    .refine((s) => !isDisposableEmailDomain(s.split("@")[1] || ""), { message: "Please use a non-disposable email address." }),
  phoneCode: z.string().min(1),
  phoneCodeCustom: z.string().optional().default(""),
  mobile: z.string(),
  founders: z.array(personName()).min(1, "Add at least one founder.").max(6, "Up to 6 founders."),

  stage: z.enum(stages, { message: "Pick the stage that matches today, not where you're heading." }),
  sector: z.preprocess(
    (v) => (typeof v === "string" ? collapseWhitespace(v) : v),
    z.string().min(2, "Enter your sector, e.g. Fintech.").max(60).refine((s) => /[a-zA-Z]/.test(s) && !/https?:\/\//i.test(s), { message: "Enter your sector, e.g. Fintech." })
  ),
  linkedin: z.array(linkedinUrl()).min(1, "Add at least one LinkedIn profile.").max(6, "Up to 6 LinkedIn profiles."),
  description: longText(200, 5000, 40, "Description"),

  marketOpportunity: longText(50, 1500, 10, "Market opportunity"),
  businessModel: longText(50, 1500, 10, "Business model"),
  monthlyRevenue: money(),
  annualRevenue: money(),
  customerCount: count(1e9),

  revenueLastFy: money(),
  hasRaised: z.boolean({ message: "Let us know whether you've raised funding." }),
  totalFundingRaised: money(1e12, { allowEmpty: true }).optional(),
  fullTimeCount: count(10000),
  partTimeCount: count(10000),

  companyProfile: fileRef().optional(),
  incorporationCert: fileRef().optional(),
  dpiitCert: requiredFileRef("The DPIIT certificate is required — every grant we file asks for it."),
  stateStartupCert: fileRef().optional(),
  gstCert: fileRef().optional(),

  website_hp: z.string().max(0, "").optional().default(""),
  startedAt: z.number(),
};

// ---------------------------------------------------------------------------
// Cross-field refinements — standalone so both the full schema and the relevant step schema
// can attach them, since a superRefine only ever runs once every field in ITS OWN object has
// already passed its own type/shape check (an unrelated blank field elsewhere in a bigger
// object would otherwise silently suppress these from ever reporting on a partial-object,
// step-by-step validation pass).
// ---------------------------------------------------------------------------

function checkPhone(data: { phoneCode: string; phoneCodeCustom?: string; mobile: string }, ctx: z.RefinementCtx) {
  const iso = resolveMobileIso(data.phoneCode, data.phoneCodeCustom ?? "");
  const digits = (data.mobile || "").replace(/\D/g, "");
  if (!digits) {
    ctx.addIssue({ code: "custom", message: "Enter a valid mobile number for the country code you picked.", path: ["mobile"] });
  } else if (iso) {
    const parsed = parsePhoneNumberFromString(digits, iso as never);
    if (!parsed || !parsed.isValid()) {
      ctx.addIssue({ code: "custom", message: "Enter a valid mobile number for the country code you picked.", path: ["mobile"] });
    }
  } else if (!/^\d{6,15}$/.test(digits)) {
    ctx.addIssue({ code: "custom", message: "Enter a valid phone number (6-15 digits).", path: ["mobile"] });
  }
}

function checkFoundersDedupe(data: { founders: string[] }, ctx: z.RefinementCtx) {
  noDuplicates(data.founders, ctx, "founder");
}

function checkLinkedinDedupe(data: { linkedin: string[] }, ctx: z.RefinementCtx) {
  noDuplicates(data.linkedin, ctx, "profile");
}

function checkFunding(data: { hasRaised: boolean; totalFundingRaised?: number }, ctx: z.RefinementCtx) {
  if (data.hasRaised && data.totalFundingRaised === undefined) {
    ctx.addIssue({ code: "custom", message: "Enter the total you've raised to date.", path: ["totalFundingRaised"] });
  }
}

function checkTeamSize(data: { fullTimeCount: number; partTimeCount: number }, ctx: z.RefinementCtx) {
  if (data.fullTimeCount + data.partTimeCount < 1) {
    ctx.addIssue({ code: "custom", message: "Add at least one team member.", path: ["fullTimeCount"] });
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** The full dossier — server-side final authority (by submit time every field is expected to
 * be present, so the superRefines below reliably execute). `.strict()` at the server call site. */
export const dossierSchema = z
  .object(fieldShapes)
  .superRefine(checkPhone)
  .superRefine(checkFoundersDedupe)
  .superRefine(checkLinkedinDedupe)
  .superRefine(checkFunding)
  .superRefine(checkTeamSize);

/**
 * Per-step schemas for incremental client-side validation — each only shapes the fields that
 * step owns (plus whatever a step's own cross-field check needs), so an unfilled LATER step's
 * required fields (e.g. `dpiitCert` while still on step 1) can never suppress THIS step's own
 * checks from running. See `dossierSchema`'s doc comment for why that suppression happens.
 */
export const stepSchemas: Record<number, z.ZodTypeAny> = {
  1: z
    .object({
      startupName: fieldShapes.startupName,
      websiteUrl: fieldShapes.websiteUrl,
      email: fieldShapes.email,
      phoneCode: fieldShapes.phoneCode,
      phoneCodeCustom: fieldShapes.phoneCodeCustom,
      mobile: fieldShapes.mobile,
      founders: fieldShapes.founders,
    })
    .superRefine(checkPhone)
    .superRefine(checkFoundersDedupe),
  2: z
    .object({
      stage: fieldShapes.stage,
      sector: fieldShapes.sector,
      linkedin: fieldShapes.linkedin,
      description: fieldShapes.description,
    })
    .superRefine(checkLinkedinDedupe),
  3: z.object({
    marketOpportunity: fieldShapes.marketOpportunity,
    businessModel: fieldShapes.businessModel,
    monthlyRevenue: fieldShapes.monthlyRevenue,
    annualRevenue: fieldShapes.annualRevenue,
    customerCount: fieldShapes.customerCount,
  }),
  4: z
    .object({
      revenueLastFy: fieldShapes.revenueLastFy,
      hasRaised: fieldShapes.hasRaised,
      totalFundingRaised: fieldShapes.totalFundingRaised,
      fullTimeCount: fieldShapes.fullTimeCount,
      partTimeCount: fieldShapes.partTimeCount,
    })
    .superRefine(checkFunding)
    .superRefine(checkTeamSize),
  5: z.object({
    companyProfile: fieldShapes.companyProfile,
    incorporationCert: fieldShapes.incorporationCert,
    dpiitCert: fieldShapes.dpiitCert,
    stateStartupCert: fieldShapes.stateStartupCert,
    gstCert: fieldShapes.gstCert,
  }),
};

export type IncubatxDossierInput = z.input<typeof dossierSchema>;
export type IncubatxDossierOutput = z.output<typeof dossierSchema>;

/** Non-blocking cross-field checks — surfaced in the UI but never gate `goNext`/submit. */
export function computeSoftWarnings(data: {
  stage: string;
  monthlyRevenue: string;
  annualRevenue: string;
}): Record<string, string> {
  const warnings: Record<string, string> = {};
  const monthly = parseIndianShorthand(data.monthlyRevenue) ?? 0;
  const annual = parseIndianShorthand(data.annualRevenue) ?? 0;
  if (data.monthlyRevenue !== "" && data.annualRevenue !== "" && annual < monthly) {
    warnings.annualRevenue = "Annual is lower than monthly — worth double-checking.";
  }
  if (data.stage === "Idea" && (monthly > 0 || annual > 0)) {
    warnings.stage = "You picked Idea stage but entered revenue.";
  }
  return warnings;
}
