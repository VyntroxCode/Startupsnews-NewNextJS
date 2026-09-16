// /sitemap.xml is already submitted in Search Console, so it keeps working by serving the
// same sitemap index as /sitemap_index.xml.
export { GET } from "../sitemap_index.xml/route";

// Route segment config must be literal in each file (Next can't read re-exported config).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
