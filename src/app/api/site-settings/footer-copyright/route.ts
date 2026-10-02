import { NextResponse } from 'next/server';
import { getFooterCopyrightTemplate } from '@/lib/site-settings';

export const maxDuration = 30;

/** The raw template (may contain `{{year}}`). The site footer no longer calls this — the root
 * layout reads the setting on the server — but it stays for any other consumer. */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: { value: await getFooterCopyrightTemplate() },
  });
}
