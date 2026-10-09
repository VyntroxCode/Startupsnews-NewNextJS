
/**
 * Cloudflare D1 dump of reader registrations.
 *
 * MySQL (`public_registrations`) stays the source of truth — login, profile and newsletter all
 * read it. Every time a NEW reader account is created (email form, Google, LinkedIn) the full
 * row is also inserted into the Cloudflare D1 database `morningpulse-users`, table
 * `registered_users_dump`, over the D1 REST API.
 *
 * That table is SHARED with the MorningPulse app (its `d1-sync.service.ts` writes the same
 * columns with user_from = 'Morningpulse'). Rows from here carry user_from = 'Startupnews', the
 * last column. Keep the column list below in step with that table.
 *
 * Every column of the table is filled from the MySQL row; `password_hash` is not a column there
 * and is never sent. It is a plain INSERT — no lookup, no upsert, and the table has no unique
 * key besides its own auto id, so the same email can appear once per site.
 *
 * Off unless CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + a token are set
 * (CLOUDFLARE_D1_API_TOKEN, falling back to CLOUDFLARE_API_TOKEN; the token needs the
 * "D1 → Edit" account permission).
 *
 * Never throws — a Cloudflare hiccup must not fail a registration.
 */

const API = "https://api.cloudflare.com/client/v4";
const REQUEST_TIMEOUT_MS = 8_000;

const TABLE = "registered_users_dump";
const USER_FROM = "Startupnews";

/** Columns copied straight from the MySQL `public_registrations` row, in the table's order. */
const USER_FIELDS = [
  "name", "email", "phone", "country", "city", "google_id", "linkedin_id", "linkedin_url",
  "auth_provider", "is_active", "timezone", "bio", "category", "other_category", "website",
  "s_name", "s_founded", "s_entity", "s_stage", "s_dpiit", "s_dpiit_number",
  "s_team_size", "s_revenue_status", "s_pitch", "s_raising", "s_amount_seeking", "s_crunchbase", "s_tracxn",
  "i_firm", "i_type", "i_check_size", "i_stage_focus", "i_sector_focus", "i_geo_focus",
  "a_program_name", "a_duration", "a_sector_focus", "a_equity_taken",
  "c_platforms", "c_niche", "c_mediakit",
  "l_firm", "l_practice_areas", "l_jurisdiction", "l_years_experience",
  "cs_firm", "cs_membership_number", "cs_services", "cs_years_experience",
  "ib_firm", "ib_years_experience", "ib_deal_types",
  "bk_bank_name", "bk_years_experience", "bk_vertical",
  "g_organization", "g_role",
  "newsletter_category_slugs", "created_at", "last_login",
  "updated_at", "last_newsletter_sent_date", "newsletter_unsubscribed",
] as const;

/** `user_from` stays last. */
const COLUMNS = ["source_user_id", ...USER_FIELDS, "founders", "funding_rounds", "dumped_at", "user_from"] as const;

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ${COLUMNS.join(",\n  ")}
)`;

const INSERT_SQL = `INSERT INTO ${TABLE} (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`;

type D1Param = string | number | null;

/** The MySQL reader row (`PublicUserEntity`); every other table column is read from it by name. */
export type D1RegistrationRow = { id: number };

function config(): { accountId: string; databaseId: string; token: string } | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
  const token = (process.env.CLOUDFLARE_D1_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN)?.trim();
  return accountId && databaseId && token ? { accountId, databaseId, token } : null;
}

export function isCloudflareD1Configured(): boolean {
  return config() !== null;
}

/** Runs one statement. Returns its rows, or null (and logs) on any failure. */
async function d1Query(sql: string, params: D1Param[] = []): Promise<Record<string, unknown>[] | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${API}/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as {
      success?: boolean;
      errors?: unknown;
      result?: { results?: Record<string, unknown>[] }[];
    } | null;
    if (!res.ok || !body?.success) {
      console.error(`[cloudflare-d1] HTTP ${res.status}: ${JSON.stringify(body?.errors ?? null).slice(0, 300)}`);
      return null;
    }
    return body.result?.[0]?.results ?? [];
  } catch (err) {
    console.error("[cloudflare-d1] request failed:", err);
    return null;
  }
}

/** Creates the table if the database is empty. Once per process; a failed attempt is retried. */
let tableReady: Promise<boolean> | null = null;
function ensureTable(): Promise<boolean> {
  if (!tableReady) {
    tableReady = d1Query(CREATE_TABLE_SQL).then((rows) => {
      if (!rows) tableReady = null;
      return rows !== null;
    });
  }
  return tableReady;
}

function toD1Param(value: unknown): D1Param {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number") return value;
  return JSON.stringify(value);
}

/**
 * Inserts one newly registered reader into D1. Returns whether the row was written.
 * `founders` / `funding_rounds` are empty at sign-up (the profile wizard fills them later).
 */
export async function mirrorRegistrationToD1(user: D1RegistrationRow): Promise<boolean> {
  if (!config()) return false;
  if (!(await ensureTable())) return false;
  const row: Record<string, unknown> = {
    ...user,
    source_user_id: user.id,
    founders: [],
    funding_rounds: [],
    dumped_at: new Date(),
    user_from: USER_FROM,
  };
  return (await d1Query(INSERT_SQL, COLUMNS.map((c) => toD1Param(row[c])))) !== null;
}
