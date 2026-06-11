import { PDFDocument } from 'pdf-lib';

export async function countPdfPages(buffer: Buffer): Promise<number | null> {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const pdf = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });

    return pdf.getPageCount();
  } catch {
    return null;
  }
}

export async function fetchPdfPageCount(fileUrl: string): Promise<number | null> {
  if (!fileUrl) {
    return null;
  }

  const response = await fetch(fileUrl, {
    signal: AbortSignal.timeout(30000),
    headers: {
      Accept: 'application/pdf,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return await countPdfPages(buffer);
}