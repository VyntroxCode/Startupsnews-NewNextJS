import * as XLSX from 'xlsx';
import type { FundingDeal } from '../domain/types';
import { dealToExportRow } from './columns';

/** Server-side .xlsx download response for a deal list — shared by the admin and reader exports. */
export function dealsXlsxResponse(deals: FundingDeal[], filePrefix: string): Response {
  const sheet = XLSX.utils.json_to_sheet(deals.map(dealToExportRow));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Funding deals');
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filePrefix}-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
