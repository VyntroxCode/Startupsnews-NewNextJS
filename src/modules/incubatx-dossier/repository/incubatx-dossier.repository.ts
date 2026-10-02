import { getDbConnection, query, queryOne } from "@/shared/database/connection";
import { COUNTRY_CODE_OPTIONS } from "@/components/ui/constants/phone";
import {
  DOSSIER_STATUSES,
  type DossierDetail,
  type DossierListItem,
  type DossierListQuery,
  type DossierStatus,
  type DossierStatusCounts,
  type IncubatxDossierSubmission,
  type IncubatxDossierRow,
} from "../domain/types";

type SqlParam = string | number | null;

type DbRow = Record<string, unknown>;

const LIST_COLUMNS =
  "id, reference, status, startup_name, email, mobile_e164, mobile_iso, stage, sector, dpiit_cert_url, submitted_at";

/** COUNT(*) and the BIGINT UNSIGNED money columns come back from the mariadb driver as BigInt,
 * which JSON.stringify can't serialise — every numeric read goes through this. */
function num(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  return Number(value);
}

/** founders / linkedin are JSON columns; MariaDB stores JSON as LONGTEXT, so the driver may hand
 * back either the raw string or an already-parsed array. */
function stringList(value: unknown): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return value ? [value] : []; }
  }
  return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
}

/** `mobile_e164` actually holds the national number as typed; the dial code isn't stored, only the
 * country ISO it was picked from — so rebuild "+91 98xxxxxxx" from that ISO for display. */
function displayMobile(number: unknown, iso: unknown): string {
  const digits = String(number ?? "").trim();
  if (!digits || digits.startsWith("+")) return digits;
  const opt = typeof iso === "string" && iso
    ? COUNTRY_CODE_OPTIONS.find((o) => o.iso.toUpperCase() === iso.toUpperCase())
    : undefined;
  return opt ? `${opt.code} ${digits}` : digits;
}

function toListItem(row: DbRow): DossierListItem {
  return {
    id: num(row.id),
    reference: (row.reference as string | null) ?? null,
    status: row.status as DossierStatus,
    startupName: String(row.startup_name ?? ""),
    email: String(row.email ?? ""),
    mobile: displayMobile(row.mobile_e164, row.mobile_iso),
    stage: String(row.stage ?? ""),
    sector: String(row.sector ?? ""),
    hasDpiit: Boolean(row.dpiit_cert_url),
    submittedAt: String(row.submitted_at ?? ""),
  };
}

function doc(row: DbRow, label: string, prefix: string) {
  return {
    label,
    url: (row[`${prefix}_url`] as string | null) ?? null,
    filename: (row[`${prefix}_filename`] as string | null) ?? null,
  };
}

function toDetail(row: DbRow): DossierDetail {
  return {
    ...toListItem(row),
    websiteUrl: String(row.website_url ?? ""),
    mobileIso: (row.mobile_iso as string | null) ?? null,
    founders: stringList(row.founders),
    linkedin: stringList(row.linkedin),
    description: String(row.description ?? ""),
    marketOpportunity: String(row.market_opportunity ?? ""),
    businessModel: String(row.business_model ?? ""),
    monthlyRevenue: num(row.monthly_revenue),
    annualRevenue: num(row.annual_revenue),
    customerCount: num(row.customer_count),
    revenueLastFy: num(row.revenue_last_fy),
    hasRaised: num(row.has_raised) === 1,
    totalFundingRaised: row.total_funding_raised === null ? null : num(row.total_funding_raised),
    fullTimeCount: num(row.full_time_count),
    partTimeCount: num(row.part_time_count),
    documents: [
      doc(row, "DPIIT Certificate", "dpiit_cert"),
      doc(row, "Company Profile / Pitch Deck", "company_profile"),
      doc(row, "Certificate of Incorporation", "incorporation_cert"),
      doc(row, "State Startup Certificate", "state_startup_cert"),
      doc(row, "GST Certificate", "gst_cert"),
    ],
    updatedAt: String(row.updated_at ?? ""),
  };
}

interface InsertResult {
  insertId?: number | bigint;
}

export class IncubatxDossierRepository {
  /** Inserts the dossier row and returns its new id — `reference` is backfilled separately
   * once the id is known (see `setReference`), since the reference is id-derived. */
  async create(
    submission: IncubatxDossierSubmission,
    summaries: { traction: string; funding: string; team: string }
  ): Promise<number> {
    const { data, mobileIso, clientIpHash, userAgent } = submission;

    const columns = [
      "startup_name", "website_url", "email", "mobile_e164", "mobile_iso", "founders",
      "stage", "sector", "linkedin", "description",
      "market_opportunity", "business_model", "monthly_revenue", "annual_revenue", "customer_count", "traction_summary",
      "revenue_last_fy", "has_raised", "total_funding_raised", "funding_summary", "full_time_count", "part_time_count", "team_summary",
      "company_profile_url", "company_profile_filename",
      "incorporation_cert_url", "incorporation_cert_filename",
      "dpiit_cert_url", "dpiit_cert_filename",
      "state_startup_cert_url", "state_startup_cert_filename",
      "gst_cert_url", "gst_cert_filename",
      "client_ip_hash", "user_agent",
    ];

    const params: SqlParam[] = [
      data.startupName, data.websiteUrl, data.email, data.mobile, mobileIso, JSON.stringify(data.founders),
      data.stage, data.sector, JSON.stringify(data.linkedin), data.description,
      data.marketOpportunity, data.businessModel, data.monthlyRevenue, data.annualRevenue, data.customerCount, summaries.traction,
      data.revenueLastFy, data.hasRaised ? 1 : 0, data.totalFundingRaised ?? null, summaries.funding, data.fullTimeCount, data.partTimeCount, summaries.team,
      data.companyProfile?.url ?? null, data.companyProfile?.filename ?? null,
      data.incorporationCert?.url ?? null, data.incorporationCert?.filename ?? null,
      data.dpiitCert.url, data.dpiitCert.filename,
      data.stateStartupCert?.url ?? null, data.stateStartupCert?.filename ?? null,
      data.gstCert?.url ?? null, data.gstCert?.filename ?? null,
      clientIpHash, userAgent,
    ];

    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO incubatx_dossiers (${columns.join(", ")}) VALUES (${placeholders})`;

    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      const result = (await connection.query(sql, params)) as InsertResult;
      const insertId = Number(result.insertId);
      if (!insertId) throw new Error("Failed to get insert ID for new IncubatX dossier");
      return insertId;
    } finally {
      connection.release();
    }
  }

  async setReference(id: number, reference: string): Promise<void> {
    await query("UPDATE incubatx_dossiers SET reference = ? WHERE id = ?", [reference, id]);
  }

  async findById(id: number): Promise<IncubatxDossierRow | null> {
    return queryOne<IncubatxDossierRow>(
      "SELECT id, reference, status, submitted_at FROM incubatx_dossiers WHERE id = ?",
      [id]
    );
  }

  /** Admin Grants list: newest first, optional status filter and a free-text search across the
   * startup name, email, reference, sector and founder names. */
  async list(q: DossierListQuery): Promise<{ rows: DossierListItem[]; total: number }> {
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (q.status) {
      where.push("status = ?");
      params.push(q.status);
    }
    if (q.search) {
      const like = `%${q.search}%`;
      where.push("(startup_name LIKE ? OR email LIKE ? OR reference LIKE ? OR sector LIKE ? OR founders LIKE ? OR mobile_e164 LIKE ?)");
      params.push(like, like, like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (q.page - 1) * q.limit;

    const [rows, countRow] = await Promise.all([
      query<DbRow>(
        `SELECT ${LIST_COLUMNS} FROM incubatx_dossiers ${whereSql} ORDER BY submitted_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, q.limit, offset]
      ),
      queryOne<DbRow>(`SELECT COUNT(*) AS total FROM incubatx_dossiers ${whereSql}`, params),
    ]);
    return { rows: rows.map(toListItem), total: num(countRow?.total) };
  }

  async statusCounts(): Promise<DossierStatusCounts> {
    const rows = await query<DbRow>("SELECT status, COUNT(*) AS n FROM incubatx_dossiers GROUP BY status");
    const counts = { total: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0 } as DossierStatusCounts;
    for (const row of rows) {
      const status = row.status as DossierStatus;
      if (!DOSSIER_STATUSES.includes(status)) continue;
      counts[status] = num(row.n);
      counts.total += num(row.n);
    }
    return counts;
  }

  async findDetailById(id: number): Promise<DossierDetail | null> {
    const row = await queryOne<DbRow>("SELECT * FROM incubatx_dossiers WHERE id = ?", [id]);
    return row ? toDetail(row) : null;
  }

  async updateStatus(id: number, status: DossierStatus): Promise<boolean> {
    const pool = await getDbConnection();
    const result = (await pool.query("UPDATE incubatx_dossiers SET status = ? WHERE id = ?", [status, id])) as { affectedRows?: number };
    return num(result.affectedRows) > 0;
  }
}
