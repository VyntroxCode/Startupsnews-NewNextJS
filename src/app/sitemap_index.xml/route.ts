import { renderSitemapIndex, xmlResponse } from "@/lib/sitemaps";

// Rendered per request (DB-backed; must not be generated at build time — see agent.md #124).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return xmlResponse(await renderSitemapIndex());
  } catch (error) {
    console.error("Failed to generate sitemap index:", error);
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}
