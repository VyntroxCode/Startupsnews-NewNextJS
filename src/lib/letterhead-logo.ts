import { readFile } from 'node:fs/promises';
import path from 'node:path';

let cached: Uint8Array | null | undefined;

/** public/logo.png for server-built letter PDFs (Node can't fetch the relative '/logo.png' the
 * browser uses). Read once per process; null if missing — letters then render without it. */
export async function letterheadLogo(): Promise<Uint8Array | null> {
  if (cached === undefined) {
    try { cached = new Uint8Array(await readFile(path.join(process.cwd(), 'public', 'logo.png'))); }
    catch { cached = null; }
  }
  return cached;
}
