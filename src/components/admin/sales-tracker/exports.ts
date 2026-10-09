import * as XLSX from 'xlsx';
import { csvCell, downloadBlob, leadExportRow, loadScriptOnce, todayStr } from './utils';
import type { LeadAssignment } from '@/modules/lead-assignments/domain/types';
import type { JsPdfDoc, UnifiedLeadRow } from './types';

/** Looks up a row's departments / people / follow-up count (keyed by its source + id). */
type AssignmentFor = (row: UnifiedLeadRow) => LeadAssignment | undefined;

/** Every export takes the All leads table's own filtered, sorted rows — sales leads and Expand North
 * Star enquiries alike — so the file always holds exactly what the table shows. */
function toRows(rows: UnifiedLeadRow[], assignmentFor: AssignmentFor): Record<string, string>[] {
  return rows.map((r) => leadExportRow(r, assignmentFor(r)));
}

/** Exports as CSV — synchronous, no external library. */
export function exportLeadsCsv(leads: UnifiedLeadRow[], assignmentFor: AssignmentFor): void {
  const rows = toRows(leads, assignmentFor);
  if (!rows.length) { alert('No leads match the current filters — nothing to export.'); return; }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')].concat(rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')));
  // Leading BOM so Excel/Sheets open the UTF-8 file without mangling special characters.
  downloadBlob('﻿' + lines.join('\r\n'), `sales-tracker-leads-${todayStr()}.csv`, 'text/csv;charset=utf-8;');
}

/** Exports via the `xlsx` npm package (already a project dependency). */
export async function exportLeadsExcel(leads: UnifiedLeadRow[], assignmentFor: AssignmentFor): Promise<void> {
  const rows = toRows(leads, assignmentFor);
  if (!rows.length) { alert('No leads match the current filters — nothing to export.'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, `sales-tracker-leads-${todayStr()}.xlsx`);
}

/** The free-text columns that get extra width in the PDF, by header name (not position, so adding
 * a column can't give the width to the wrong one). */
const WIDE_PDF_COLUMNS: Record<string, number> = {
  Query: 160, 'Last Call Discussion': 140, 'Event Description': 160, 'Tell Us More': 160,
};

/** Exports via jsPDF + jspdf-autotable, loaded from CDN on demand (not npm deps here). */
export async function exportLeadsPdf(leads: UnifiedLeadRow[], assignmentFor: AssignmentFor): Promise<void> {
  const rows = toRows(leads, assignmentFor);
  if (!rows.length) { alert('No leads match the current filters — nothing to export.'); return; }
  try {
    const w = window as unknown as { jspdf?: { jsPDF: new (opts: Record<string, unknown>) => JsPdfDoc } };
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => typeof w.jspdf !== 'undefined');
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js', () => !!(w.jspdf && (w.jspdf.jsPDF as unknown as { API?: { autoTable?: unknown } }).API?.autoTable));
    const { jsPDF } = w.jspdf!;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => r[h]));
    const columnStyles = Object.fromEntries(
      headers.flatMap((h, i) => (WIDE_PDF_COLUMNS[h] ? [[i, { cellWidth: WIDE_PDF_COLUMNS[h] }]] : []))
    );
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('Sales Tracker — Leads', 40, 30);
    doc.autoTable({
      head: [headers], body, startY: 45,
      styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      columnStyles,
    });
    doc.save(`sales-tracker-leads-${todayStr()}.pdf`);
  } catch {
    alert('Could not load the PDF export library — check your internet connection and try again.');
  }
}
