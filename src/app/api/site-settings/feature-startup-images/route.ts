import { NextResponse } from 'next/server';
import { getFeatureStartupImages } from '@/lib/site-settings';

export const maxDuration = 30;

/** Empty string (unset) tells the public page to fall back to its bundled local placeholder
 * image — unlike footer-copyright, there is no text default to fall back to here. The page itself
 * now reads this on the server; the endpoint stays for any other consumer. */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: await getFeatureStartupImages(),
  });
}
