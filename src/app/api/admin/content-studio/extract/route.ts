import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/shared/middleware/auth.middleware";
import { CONTENT_STUDIO_ROLES } from "@/shared/middleware/roles";
import { fetchArticlePage } from "@/modules/content-studio/lib/feeds/extract";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content-studio/extract — fetch a URL and return its article text.
 *
 * Backs the URL Import tab. Replaces `fetchURL` + the r.jina.ai / CORS-proxy
 * chain (content-studio-v17.html:1103-1172).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTENT_STUDIO_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body?.url || "").trim();
  if (!url) return Response.json({ error: "No URL provided" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "That does not look like a URL" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "Only http and https URLs are supported" }, { status: 400 });
  }

  try {
    const page = await fetchArticlePage(url);
    if (!page.text || page.text.length < 300) {
      return Response.json(
        {
          error:
            "Could not pull enough text from this URL — the site may block automated access. Try pasting the article text into the Topic tab instead.",
        },
        { status: 422 },
      );
    }
    return Response.json(page);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not fetch this URL — the site may block automated access.",
      },
      { status: 502 },
    );
  }
}
