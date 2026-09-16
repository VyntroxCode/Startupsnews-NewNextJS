import { renderNewsSitemap, xmlResponse } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return xmlResponse(await renderNewsSitemap());
  } catch (error) {
    console.error("Failed to generate news sitemap:", error);
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}
