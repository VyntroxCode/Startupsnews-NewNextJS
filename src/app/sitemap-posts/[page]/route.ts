import { getPostEntries, renderUrlset, xmlResponse } from "@/lib/sitemaps";

// Public URL is /sitemap-posts-<n>.xml — rewritten here in next.config.ts, because a
// dynamic segment can't share a folder name with a fixed prefix/suffix.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!/^\d+$/.test(page)) return new Response("Not found", { status: 404 });

  try {
    const entries = await getPostEntries(Number(page));
    if (!entries) return new Response("Not found", { status: 404 });
    return xmlResponse(renderUrlset(entries));
  } catch (error) {
    console.error(`Failed to generate posts sitemap ${page}:`, error);
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}
