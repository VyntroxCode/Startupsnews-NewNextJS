import { dossierSchema, resolveMobileIso, type IncubatxDossierOutput } from "@/lib/validation/incubatx-dossier";
import { formatIndianCurrency } from "@/lib/format/indian-number";
import { hashIp } from "@/lib/request-fingerprint";
import { sendSmtpMail, isSmtpConfigured } from "@/lib/smtp";
import { IncubatxDossierValidationError } from "../domain/types";
import { IncubatxDossierRepository } from "../repository/incubatx-dossier.repository";

function buildSummaries(data: IncubatxDossierOutput) {
  const traction = `Monthly: ${formatIndianCurrency(data.monthlyRevenue)} · Annual: ${formatIndianCurrency(data.annualRevenue)} · Customers/Users: ${data.customerCount}`;
  const funding = data.hasRaised ? `Raised: Yes — ${formatIndianCurrency(data.totalFundingRaised ?? 0)}` : "Raised: No";
  const team = `${data.fullTimeCount} full-time, ${data.partTimeCount} part-time`;
  return { traction, funding, team };
}

function buildOpsEmailBody(reference: string, data: IncubatxDossierOutput): string {
  const docLine = (label: string, f?: { url: string; filename: string } | null) => `${label}: ${f ? `${f.filename} — ${f.url}` : "not provided"}`;
  return [
    `New IncubatX dossier submission — ${reference}`,
    "",
    `Startup Name: ${data.startupName}`,
    `Website: ${data.websiteUrl}`,
    `Email: ${data.email}`,
    `Mobile: ${data.phoneCode} ${data.mobile}`,
    `Founders: ${data.founders.join(", ")}`,
    "",
    `Stage: ${data.stage}`,
    `Sector: ${data.sector}`,
    `LinkedIn: ${data.linkedin.join(", ")}`,
    `Description: ${data.description}`,
    "",
    `Market Opportunity: ${data.marketOpportunity}`,
    `Business Model: ${data.businessModel}`,
    `Monthly Revenue: ${formatIndianCurrency(data.monthlyRevenue)}`,
    `Annual Revenue: ${formatIndianCurrency(data.annualRevenue)}`,
    `Customers/Users: ${data.customerCount}`,
    "",
    `Revenue (Last FY): ${formatIndianCurrency(data.revenueLastFy)}`,
    `Raised Funding: ${data.hasRaised ? `Yes — ${formatIndianCurrency(data.totalFundingRaised ?? 0)}` : "No"}`,
    `Team: ${data.fullTimeCount} full-time, ${data.partTimeCount} part-time`,
    "",
    docLine("Company Profile", data.companyProfile),
    docLine("Certificate of Incorporation", data.incorporationCert),
    docLine("DPIIT Certificate", data.dpiitCert),
    docLine("State Startup Certificate", data.stateStartupCert),
    docLine("GST Certificate", data.gstCert),
  ].join("\n");
}

export class IncubatxDossierService {
  constructor(private repository: IncubatxDossierRepository) {}

  /** Re-validates with the same schema used client-side (`.strict()` here — the server is the
   * sole source of truth), persists the row, backfills its reference, and best-effort emails
   * ops. Honeypot/timing/rate-limit checks happen in the route handler, before this is ever
   * called, since they need raw request data (headers, unparsed body) this method doesn't see. */
  async submit(payload: unknown, meta: { ip: string; userAgent: string | null }): Promise<{ reference: string }> {
    const result = dossierSchema.strict().safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      throw new IncubatxDossierValidationError("Please fix the highlighted fields.", fieldErrors);
    }

    const data = result.data;
    const mobileIso = resolveMobileIso(data.phoneCode, data.phoneCodeCustom ?? "");
    const clientIpHash = meta.ip ? hashIp(meta.ip) : null;
    const summaries = buildSummaries(data);

    const id = await this.repository.create({ data, mobileIso, clientIpHash, userAgent: meta.userAgent }, summaries);
    const reference = `IX-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;
    await this.repository.setReference(id, reference);

    // Email failure must not fail an already-committed submission — log and continue.
    try {
      if (isSmtpConfigured()) {
        await sendSmtpMail({
          to: process.env.INCUBATX_OPS_EMAIL || process.env.SMTP_TO || "office@startupnews.fyi",
          subject: `IncubatX dossier submitted — ${reference} (${data.startupName})`,
          text: buildOpsEmailBody(reference, data),
        });
      }
    } catch (error) {
      console.error("IncubatX ops notification email failed (submission was still recorded):", error);
    }

    return { reference };
  }
}

export const incubatxDossierService = new IncubatxDossierService(new IncubatxDossierRepository());
