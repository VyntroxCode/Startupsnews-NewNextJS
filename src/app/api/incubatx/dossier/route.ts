import { NextRequest, NextResponse } from "next/server";
import { incubatxDossierService } from "@/modules/incubatx-dossier/service/incubatx-dossier.service";
import { IncubatxDossierValidationError } from "@/modules/incubatx-dossier/domain/types";
import { getClientIp } from "@/lib/request-fingerprint";
import { checkRateLimit } from "@/lib/rate-limit/incubatx-rate-limiter";

export const runtime = "nodejs";

const RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };
const MIN_FILL_TIME_MS = 8000;

function fakeReference(): string {
  return `IX-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

/**
 * POST /api/incubatx/dossier — re-validates with the same schema the client uses (server is the
 * sole source of truth), gated by a honeypot field, a submit-timing check, and a per-IP rate
 * limit, before persisting via IncubatxDossierService.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (ip && !checkRateLimit(`incubatx-dossier:${ip}`, RATE_LIMIT)) {
    return NextResponse.json({ success: false, error: "Too many submissions from this connection — please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body is required." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;

  // Honeypot — real users never see or fill this field. Return a fake success so a bot that
  // filled every field doesn't learn it was caught, rather than a 400 it could learn from.
  if (typeof record.website_hp === "string" && record.website_hp.trim() !== "") {
    return NextResponse.json({ success: true, data: { reference: fakeReference() } }, { status: 201 });
  }

  // Timing — a real person can't fill a 20-question dossier in under 8 seconds.
  if (typeof record.startedAt === "number" && Date.now() - record.startedAt < MIN_FILL_TIME_MS) {
    return NextResponse.json({ success: false, error: "Please review your answers and submit again." }, { status: 400 });
  }

  try {
    const result = await incubatxDossierService.submit(body, { ip, userAgent: request.headers.get("user-agent") });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof IncubatxDossierValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, fieldErrors: error.fieldErrors },
        { status: 400 }
      );
    }
    console.error("Error submitting IncubatX dossier:", error);
    return NextResponse.json({ success: false, error: "Failed to submit — please try again." }, { status: 500 });
  }
}
