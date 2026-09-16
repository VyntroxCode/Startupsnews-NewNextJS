import { getStaticEntries, renderUrlset, xmlResponse } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";

export function GET() {
  return xmlResponse(renderUrlset(getStaticEntries()));
}
