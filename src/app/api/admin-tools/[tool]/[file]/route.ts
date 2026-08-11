import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Standalone html/css/js admin tools (Sales Tracker, HR Tool, ...) whose source files live
// under src/modules/admin-tools/<tool>/ rather than /public, so this route serves them
// instead of relying on Next's built-in static file server. Both segments are checked
// against a fixed whitelist before ever touching the filesystem, so a path like
// "../../.env" for `file` 404s on the lookup below and never reaches readFile.
const TOOLS = new Set(['sales-tracker', 'hr-tool']);
const CONTENT_TYPES: Record<string, string> = {
  'index.html': 'text/html; charset=utf-8',
  'styles.css': 'text/css; charset=utf-8',
  'script.js': 'application/javascript; charset=utf-8',
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tool: string; file: string }> }) {
  const { tool, file } = await params;
  const contentType = CONTENT_TYPES[file];
  if (!TOOLS.has(tool) || !contentType) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  try {
    const filePath = path.join(process.cwd(), 'src', 'modules', 'admin-tools', tool, file);
    const content = await readFile(filePath, 'utf-8');
    return new NextResponse(content, { status: 200, headers: { 'Content-Type': contentType } });
  } catch {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
