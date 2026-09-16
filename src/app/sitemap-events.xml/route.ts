import { getEventEntries, renderUrlset, xmlResponse } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return xmlResponse(renderUrlset(await getEventEntries()));
  } catch (error) {
    console.error("Failed to generate events sitemap:", error);
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}
