import { getDbConnection, query, queryOne } from "@/shared/database/connection";
import type { IncubatxDossierSubmission, IncubatxDossierRow } from "../domain/types";

type SqlParam = string | number | null;

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
}
