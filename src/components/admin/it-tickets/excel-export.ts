/**
 * IT Tickets → Excel (.xlsx) with NATIVE Excel pie charts.
 *
 * Loaded only when someone clicks "Export Excel" (ItTicketsPage dynamic-imports this module, and this
 * module dynamic-imports exceljs + jszip), so none of it ships with the board.
 *
 * How the charts are made: ExcelJS builds the styled workbook (it can't write charts), then JSZip opens
 * the .xlsx and adds the standard OOXML chart parts for the Summary sheet — one DrawingML pie chart per
 * breakdown table, pointing at that table's cells (so the charts are real, editable Excel charts that
 * follow the numbers), a drawing that anchors them next to their tables, the relationships, and the
 * content-type overrides.
 *
 * Sheets: Summary (headline numbers + 6 breakdown tables + 6 pie charts) · Tickets (every field) ·
 * Workload (assignee × status) · Comments · Attachments.
 */
import type { Workbook, Worksheet, Cell } from 'exceljs';
import { PRIORITY_LABELS, STATUS_COLUMNS, STATUS_LABELS, TYPE_LABELS } from './constants';
import { buildTicketReport, daysBetween, dueHealth, DUE_HEALTH_META, type ReportBreakdown } from './reports';
import { parseDbDate, todayIso } from './utils';
import type { ItTicket, ItTicketExport, ItTicketStatus } from './types';

export interface TicketsExportOptions {
  filterSummary: string;
  exportedBy: string;
  /** Page URL used for the per-ticket links, e.g. https://dev.startupgpt.fyi/admin/it-tickets */
  pageUrl: string;
}

type ExcelJSModule = typeof import('exceljs');

const INDIGO = '4F46E5';
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 } as const;
const SLATE_500 = 'FF64748B';

const STATUS_FILL: Record<ItTicketStatus, { fill: string; font: string }> = {
  open: { fill: 'FFE2E8F0', font: 'FF334155' },
  in_progress: { fill: 'FFDBEAFE', font: 'FF1E40AF' },
  blocked: { fill: 'FFFEE2E2', font: 'FF991B1B' },
  resolved: { fill: 'FFD1FAE5', font: 'FF065F46' },
  closed: { fill: 'FF334155', font: 'FFFFFFFF' },
};

const PRIORITY_FONT: Record<string, string> = {
  urgent: 'FFDC2626', high: 'FFEA580C', medium: 'FFD97706', low: 'FF16A34A',
};

function argb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

function solid(color: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } };
}

/**
 * ExcelJS stores a JS Date as a UTC serial. Shift by the browser's offset so the cell shows the same
 * wall-clock time the board shows (the team works in IST), instead of the UTC time.
 */
function excelDate(value: string | null | undefined): Date | null {
  const d = parseDbDate(value);
  if (!d) return null;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
}

function sourceLabel(role: string | null | undefined): string {
  return role === 'employee' ? 'Employee portal' : 'Admin panel';
}

function styleHeaderRow(ws: Worksheet, rowNumber: number, columnCount: number) {
  const row = ws.getRow(rowNumber);
  row.height = 22;
  for (let c = 1; c <= columnCount; c++) {
    const cell = row.getCell(c);
    cell.font = HEADER_FONT;
    cell.fill = solid(`FF${INDIGO}`);
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF3730A3' } } };
  }
}

function freezeAndFilter(ws: Worksheet, columnCount: number) {
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnCount } };
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------------------------

interface PieChartSpec {
  title: string;
  /** e.g. 'Summary'!$A$12:$A$16 */
  catRef: string;
  valRef: string;
  labels: string[];
  values: number[];
  colors: string[];
  /** Zero-based cell anchor for the chart frame. */
  from: { col: number; row: number };
  to: { col: number; row: number };
}

function buildSummarySheet(wb: Workbook, data: ItTicketExport, options: TicketsExportOptions): PieChartSpec[] {
  const report = buildTicketReport(data.tickets);
  const ws = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 11;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 3;
  for (let c = 5; c <= 13; c++) ws.getColumn(c).width = 11;

  const title = ws.getCell('A1');
  title.value = 'IT Tickets report';
  title.font = { bold: true, size: 18, color: { argb: 'FF0F172A' } };
  ws.getRow(1).height = 28;

  const generated = new Date(data.generatedAt);
  ws.getCell('A2').value = `Generated ${generated.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}${options.exportedBy ? ` by ${options.exportedBy}` : ''}`;
  ws.getCell('A2').font = { color: { argb: SLATE_500 } };
  ws.getCell('A3').value = `Filters: ${options.filterSummary}`;
  ws.getCell('A3').font = { color: { argb: SLATE_500 } };

  // ---- Headline numbers ----
  let row = 5;
  const kpiHeader = ws.getRow(row);
  kpiHeader.getCell(1).value = 'At a glance';
  kpiHeader.getCell(2).value = 'Value';
  styleHeaderRow(ws, row, 3);
  row++;
  for (const k of report.kpis) {
    ws.getCell(row, 1).value = k.label;
    const v = ws.getCell(row, 2);
    v.value = k.value;
    v.font = { bold: true, size: 12 };
    v.alignment = { horizontal: 'right' };
    if (k.hint === 'days') {
      ws.getCell(row, 3).value = 'days';
      ws.getCell(row, 3).font = { color: { argb: SLATE_500 } };
    }
    for (let c = 1; c <= 3; c++) ws.getCell(row, c).border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    row++;
  }

  // ---- Breakdown tables, each with a pie chart to its right ----
  const charts: PieChartSpec[] = [];
  row += 2;
  const CHART_ROWS = 17;

  for (const b of report.breakdowns) {
    const headerRow = row;
    const header = ws.getRow(headerRow);
    header.getCell(1).value = b.title;
    header.getCell(2).value = 'Tickets';
    header.getCell(3).value = 'Share';
    styleHeaderRow(ws, headerRow, 3);
    header.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    header.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

    const firstDataRow = headerRow + 1;
    b.slices.forEach((s, i) => {
      const r = firstDataRow + i;
      const label = ws.getCell(r, 1);
      label.value = s.label;
      label.border = { left: { style: 'thick', color: { argb: argb(s.color) } }, bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
      const count = ws.getCell(r, 2);
      count.value = s.count;
      count.alignment = { horizontal: 'right' };
      count.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
      const share = ws.getCell(r, 3);
      share.value = b.total ? s.count / b.total : 0;
      share.numFmt = '0.0%';
      share.alignment = { horizontal: 'right' };
      share.font = { color: { argb: SLATE_500 } };
      share.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
    const lastDataRow = firstDataRow + b.slices.length - 1;
    const totalRow = lastDataRow + 1;
    ws.getCell(totalRow, 1).value = 'Total';
    ws.getCell(totalRow, 2).value = b.total;
    ws.getCell(totalRow, 2).alignment = { horizontal: 'right' };
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(totalRow, c);
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } };
    }

    charts.push(pieSpecFor(b, firstDataRow, lastDataRow, headerRow));
    row = headerRow + Math.max(b.slices.length + 3, CHART_ROWS + 1);
  }

  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return charts;
}

function pieSpecFor(b: ReportBreakdown, firstDataRow: number, lastDataRow: number, headerRow: number): PieChartSpec {
  return {
    title: b.title,
    catRef: `'Summary'!$A$${firstDataRow}:$A$${lastDataRow}`,
    valRef: `'Summary'!$B$${firstDataRow}:$B$${lastDataRow}`,
    labels: b.slices.map((s) => s.label),
    values: b.slices.map((s) => s.count),
    colors: b.slices.map((s) => s.color.replace('#', '').toUpperCase()),
    // Columns E..M (zero-based 4..12), from the table's header row down CHART_ROWS rows.
    from: { col: 4, row: headerRow - 1 },
    to: { col: 12, row: headerRow - 1 + 16 },
  };
}

function buildTicketsSheet(wb: Workbook, data: ItTicketExport, options: TicketsExportOptions) {
  const ws = wb.addWorksheet('Tickets');
  const now = new Date();
  const today = todayIso();
  ws.columns = [
    { header: 'Key', key: 'key', width: 9 },
    { header: 'Summary', key: 'title', width: 42 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Status', key: 'status', width: 13 },
    { header: 'Reporter', key: 'reporter', width: 22 },
    { header: 'Raised from', key: 'source', width: 16 },
    { header: 'Assignee', key: 'assignee', width: 22 },
    { header: 'Due date', key: 'due', width: 13 },
    { header: 'Due-date health', key: 'health', width: 18 },
    { header: 'Created', key: 'created', width: 18 },
    { header: 'Last updated', key: 'updated', width: 18 },
    { header: 'Resolved', key: 'resolved', width: 18 },
    { header: 'Age (days)', key: 'age', width: 11 },
    { header: 'Days to resolve', key: 'toResolve', width: 14 },
    { header: 'Comments', key: 'comments', width: 11 },
    { header: 'Attachments', key: 'attachments', width: 12 },
    { header: 'Link', key: 'link', width: 14 },
  ];
  styleHeaderRow(ws, 1, ws.columns.length);

  // Oldest key first reads naturally in a spreadsheet (IT-1, IT-2, …).
  const tickets = [...data.tickets].sort((a, b) => keyNumber(a) - keyNumber(b));
  for (const t of tickets) {
    const created = parseDbDate(t.createdAt);
    const resolved = parseDbDate(t.resolvedAt);
    const done = t.status === 'resolved' || t.status === 'closed';
    const row = ws.addRow({
      key: t.ticketKey,
      title: t.title,
      description: t.description ?? '',
      type: TYPE_LABELS[t.type] ?? t.type,
      priority: PRIORITY_LABELS[t.priority] ?? t.priority,
      status: STATUS_LABELS[t.status] ?? t.status,
      reporter: t.reporterName,
      source: sourceLabel(t.reporterRole),
      assignee: t.assigneeName ?? 'Unassigned',
      due: excelDate(t.dueDate),
      health: DUE_HEALTH_META[dueHealth(t, today)].label,
      created: excelDate(t.createdAt),
      updated: excelDate(t.updatedAt),
      resolved: excelDate(t.resolvedAt),
      age: done ? null : daysBetween(created, now),
      toResolve: done ? daysBetween(created, resolved) : null,
      comments: t.commentCount,
      attachments: t.attachmentCount,
      link: { text: 'Open ticket', hyperlink: `${options.pageUrl}?ticket=${encodeURIComponent(t.ticketKey)}` },
    });
    row.alignment = { vertical: 'top' };
    row.getCell('title').alignment = { vertical: 'top', wrapText: true };
    row.getCell('description').alignment = { vertical: 'top', wrapText: true };
    row.getCell('key').font = { bold: true };
    const st = STATUS_FILL[t.status];
    if (st) {
      const cell = row.getCell('status');
      cell.fill = solid(st.fill);
      cell.font = { bold: true, color: { argb: st.font } };
    }
    row.getCell('priority').font = { bold: true, color: { argb: PRIORITY_FONT[t.priority] ?? SLATE_500 } };
    if (dueHealth(t, today) === 'overdue') row.getCell('health').font = { bold: true, color: { argb: 'FFDC2626' } };
    for (const k of ['due']) row.getCell(k).numFmt = 'dd mmm yyyy';
    for (const k of ['created', 'updated', 'resolved']) row.getCell(k).numFmt = 'dd mmm yyyy hh:mm';
    row.getCell('link').font = { color: { argb: 'FF4F46E5' }, underline: true };
  }
  freezeAndFilter(ws, ws.columns.length);
}

function keyNumber(t: ItTicket): number {
  const n = parseInt(t.ticketKey.replace(/^\D+/, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

function buildWorkloadSheet(wb: Workbook, data: ItTicketExport) {
  const report = buildTicketReport(data.tickets);
  const ws = wb.addWorksheet('Workload');
  ws.columns = [
    { header: 'Assignee', key: 'assignee', width: 26 },
    ...STATUS_COLUMNS.map((s) => ({ header: s.label, key: s.key, width: 13 })),
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Overdue', key: 'overdue', width: 10 },
  ];
  styleHeaderRow(ws, 1, ws.columns.length);
  for (const w of report.workload) {
    const row = ws.addRow({ assignee: w.assignee, ...w.counts, total: w.total, overdue: w.overdue });
    row.getCell('total').font = { bold: true };
    if (w.overdue) row.getCell('overdue').font = { bold: true, color: { argb: 'FFDC2626' } };
  }
  const totals: Record<string, string | number> = { assignee: 'Total' };
  for (const s of STATUS_COLUMNS) totals[s.key] = report.workload.reduce((sum, w) => sum + w.counts[s.key], 0);
  totals.total = report.total;
  totals.overdue = report.workload.reduce((sum, w) => sum + w.overdue, 0);
  const totalRow = ws.addRow(totals);
  totalRow.font = { bold: true };
  totalRow.eachCell((cell: Cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } }; });
  freezeAndFilter(ws, ws.columns.length);
}

function buildCommentsSheet(wb: Workbook, data: ItTicketExport) {
  const ws = wb.addWorksheet('Comments');
  const byId = new Map(data.tickets.map((t) => [t.id, t]));
  ws.columns = [
    { header: 'Ticket', key: 'key', width: 9 },
    { header: 'Ticket summary', key: 'title', width: 36 },
    { header: 'Author', key: 'author', width: 22 },
    { header: 'Author from', key: 'source', width: 16 },
    { header: 'Posted', key: 'posted', width: 18 },
    { header: 'Comment', key: 'body', width: 80 },
  ];
  styleHeaderRow(ws, 1, ws.columns.length);
  const rows = [...data.comments].sort((a, b) =>
    keyNumber(byId.get(a.ticketId) as ItTicket) - keyNumber(byId.get(b.ticketId) as ItTicket) || a.createdAt.localeCompare(b.createdAt));
  for (const c of rows) {
    const t = byId.get(c.ticketId);
    const row = ws.addRow({
      key: t?.ticketKey ?? '', title: t?.title ?? '', author: c.authorName, source: sourceLabel(c.authorRole),
      posted: excelDate(c.createdAt), body: c.body,
    });
    row.alignment = { vertical: 'top' };
    row.getCell('body').alignment = { vertical: 'top', wrapText: true };
    row.getCell('title').alignment = { vertical: 'top', wrapText: true };
    row.getCell('posted').numFmt = 'dd mmm yyyy hh:mm';
  }
  if (!rows.length) ws.addRow({ key: '', title: 'No comments on these tickets.' });
  freezeAndFilter(ws, ws.columns.length);
}

function buildAttachmentsSheet(wb: Workbook, data: ItTicketExport) {
  const ws = wb.addWorksheet('Attachments');
  const byId = new Map(data.tickets.map((t) => [t.id, t]));
  ws.columns = [
    { header: 'Ticket', key: 'key', width: 9 },
    { header: 'Ticket summary', key: 'title', width: 36 },
    { header: 'File', key: 'file', width: 36 },
    { header: 'Type', key: 'mime', width: 22 },
    { header: 'Size (KB)', key: 'size', width: 11 },
    { header: 'Uploaded by', key: 'by', width: 22 },
    { header: 'Uploaded from', key: 'source', width: 16 },
    { header: 'Uploaded', key: 'at', width: 18 },
  ];
  styleHeaderRow(ws, 1, ws.columns.length);
  const rows = [...data.attachments].sort((a, b) =>
    keyNumber(byId.get(a.ticketId) as ItTicket) - keyNumber(byId.get(b.ticketId) as ItTicket) || a.createdAt.localeCompare(b.createdAt));
  for (const a of rows) {
    const t = byId.get(a.ticketId);
    const row = ws.addRow({
      key: t?.ticketKey ?? '', title: t?.title ?? '',
      file: { text: a.fileName, hyperlink: a.fileUrl },
      mime: a.mimeType ?? '', size: a.fileSize ? Math.round((a.fileSize / 1024) * 10) / 10 : null,
      by: a.uploadedByName, source: sourceLabel(a.uploadedByRole), at: excelDate(a.createdAt),
    });
    row.getCell('file').font = { color: { argb: 'FF4F46E5' }, underline: true };
    row.getCell('at').numFmt = 'dd mmm yyyy hh:mm';
  }
  if (!rows.length) ws.addRow({ key: '', title: 'No attachments on these tickets.' });
  freezeAndFilter(ws, ws.columns.length);
}

// ---------------------------------------------------------------------------------------------
// Native pie charts (OOXML DrawingML) injected into the Summary sheet
// ---------------------------------------------------------------------------------------------

const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const REL_DRAWING = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing';
const REL_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart';
const CT_DRAWING = 'application/vnd.openxmlformats-officedocument.drawing+xml';
const CT_CHART = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';

function chartXml(spec: PieChartSpec): string {
  const n = spec.labels.length;
  const dataPoints = spec.colors.map((color, i) =>
    `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:ln w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('');
  const catPts = spec.labels.map((l, i) => `<c:pt idx="${i}"><c:v>${xmlEscape(l)}</c:v></c:pt>`).join('');
  const valPts = spec.values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('');
  const txPr = (size: number, bold: boolean, color: string) =>
    `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">
<c:roundedCorners val="0"/>
<c:chart>
<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1200" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill></a:rPr><a:t>${xmlEscape(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/>
<c:plotArea>
<c:layout/>
<c:pieChart>
<c:varyColors val="1"/>
<c:ser>
<c:idx val="0"/><c:order val="0"/>
<c:tx><c:v>Tickets</c:v></c:tx>
${dataPoints}
<c:dLbls><c:numFmt formatCode="0%;;;" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, true, 'FFFFFF')}<c:dLblPos val="inEnd"/><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="0"/></c:dLbls>
<c:cat><c:strRef><c:f>${xmlEscape(spec.catRef)}</c:f><c:strCache><c:ptCount val="${n}"/>${catPts}</c:strCache></c:strRef></c:cat>
<c:val><c:numRef><c:f>${xmlEscape(spec.valRef)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${n}"/>${valPts}</c:numCache></c:numRef></c:val>
</c:ser>
<c:firstSliceAng val="0"/>
</c:pieChart>
<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
</c:plotArea>
<c:legend><c:legendPos val="r"/><c:overlay val="0"/>${txPr(900, false, '334155')}</c:legend>
<c:plotVisOnly val="1"/>
<c:dispBlanksAs val="gap"/>
</c:chart>
<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr>
</c:chartSpace>`;
}

function drawingXml(specs: PieChartSpec[], firstRelIndex: number): string {
  const anchors = specs.map((s, i) => `<xdr:twoCellAnchor editAs="oneCell">
<xdr:from><xdr:col>${s.from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${s.from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>${s.to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${s.to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
<xdr:graphicFrame macro="">
<xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="${xmlEscape(s.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
<a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="rId${firstRelIndex + i}"/></a:graphicData></a:graphic>
</xdr:graphicFrame>
<xdr:clientData/>
</xdr:twoCellAnchor>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}">
${anchors}
</xdr:wsDr>`;
}

type JSZipInstance = import('jszip');

async function readText(zip: JSZipInstance, path: string): Promise<string | null> {
  const f = zip.file(path);
  return f ? f.async('string') : null;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

/** Finds the worksheet part for a sheet name via workbook.xml + its relationships. */
async function worksheetPath(zip: JSZipInstance, sheetName: string): Promise<string> {
  const workbook = await readText(zip, 'xl/workbook.xml');
  const rels = await readText(zip, 'xl/_rels/workbook.xml.rels');
  if (!workbook || !rels) throw new Error('Workbook parts missing');
  const sheetTag = (workbook.match(/<sheet\b[^>]*\/>/g) || []).find((t) => attr(t, 'name') === xmlEscape(sheetName));
  const rid = sheetTag ? attr(sheetTag, 'r:id') : null;
  const relTag = (rels.match(/<Relationship\b[^>]*\/>/g) || []).find((t) => attr(t, 'Id') === rid);
  const target = relTag ? attr(relTag, 'Target') : null;
  if (!target) throw new Error(`Sheet ${sheetName} not found`);
  return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
}

async function injectPieCharts(buffer: ArrayBuffer, sheetName: string, specs: PieChartSpec[]): Promise<ArrayBuffer> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const sheetPath = await worksheetPath(zip, sheetName);
  const sheetDir = sheetPath.slice(0, sheetPath.lastIndexOf('/'));
  const sheetFile = sheetPath.slice(sheetPath.lastIndexOf('/') + 1);
  const sheetRelsPath = `${sheetDir}/_rels/${sheetFile}.rels`;

  let drawingNo = 1;
  while (zip.file(`xl/drawings/drawing${drawingNo}.xml`)) drawingNo++;
  let chartNo = 1;
  while (zip.file(`xl/charts/chart${chartNo}.xml`)) chartNo++;

  // Charts + the drawing that places them.
  const overrides: string[] = [`<Override PartName="/xl/drawings/drawing${drawingNo}.xml" ContentType="${CT_DRAWING}"/>`];
  const drawingRels: string[] = [];
  specs.forEach((spec, i) => {
    const n = chartNo + i;
    zip.file(`xl/charts/chart${n}.xml`, chartXml(spec));
    overrides.push(`<Override PartName="/xl/charts/chart${n}.xml" ContentType="${CT_CHART}"/>`);
    drawingRels.push(`<Relationship Id="rId${i + 1}" Type="${REL_CHART}" Target="../charts/chart${n}.xml"/>`);
  });
  zip.file(`xl/drawings/drawing${drawingNo}.xml`, drawingXml(specs, 1));
  zip.file(
    `xl/drawings/_rels/drawing${drawingNo}.xml.rels`,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS_PKG_REL}">${drawingRels.join('')}</Relationships>`
  );

  // Sheet → drawing relationship.
  const existingRels = await readText(zip, sheetRelsPath);
  let drawingRid = 'rIdItTicketsDrawing1';
  const drawingRel = (id: string) => `<Relationship Id="${id}" Type="${REL_DRAWING}" Target="../drawings/drawing${drawingNo}.xml"/>`;
  if (existingRels) {
    let k = 1;
    while (existingRels.includes(`Id="rIdItTicketsDrawing${k}"`)) k++;
    drawingRid = `rIdItTicketsDrawing${k}`;
    zip.file(sheetRelsPath, existingRels.replace('</Relationships>', `${drawingRel(drawingRid)}</Relationships>`));
  } else {
    zip.file(sheetRelsPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS_PKG_REL}">${drawingRel(drawingRid)}</Relationships>`);
  }

  // <drawing> goes after pageSetup/headerFooter and before legacyDrawing/tableParts/extLst (schema order).
  let sheetXml = await readText(zip, sheetPath);
  if (!sheetXml) throw new Error('Summary sheet part missing');
  const rootTag = /<worksheet\b[^>]*>/.exec(sheetXml)?.[0];
  if (rootTag && !rootTag.includes('xmlns:r=')) {
    sheetXml = sheetXml.replace(rootTag, rootTag.replace('<worksheet', `<worksheet xmlns:r="${NS_R}"`));
  }
  const drawingTag = `<drawing r:id="${drawingRid}"/>`;
  const before = ['<legacyDrawing', '<legacyDrawingHF', '<drawingHF', '<picture', '<oleObjects', '<controls', '<webPublishItems', '<tableParts', '<extLst']
    .map((t) => sheetXml!.indexOf(t))
    .filter((i) => i >= 0);
  const insertAt = before.length ? Math.min(...before) : sheetXml.lastIndexOf('</worksheet>');
  sheetXml = sheetXml.slice(0, insertAt) + drawingTag + sheetXml.slice(insertAt);
  zip.file(sheetPath, sheetXml);

  // Content types.
  const contentTypes = await readText(zip, '[Content_Types].xml');
  if (!contentTypes) throw new Error('[Content_Types].xml missing');
  zip.file('[Content_Types].xml', contentTypes.replace('</Types>', `${overrides.join('')}</Types>`));

  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

/** Builds the complete .xlsx (styled sheets + native pie charts) as bytes. */
export async function buildTicketsWorkbook(data: ItTicketExport, options: TicketsExportOptions): Promise<ArrayBuffer> {
  const imported = (await import('exceljs')) as ExcelJSModule & { default?: ExcelJSModule };
  const ExcelJS = imported.default ?? imported;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'StartupNews.fyi — IT Tickets';
  wb.created = new Date(data.generatedAt);

  const charts = buildSummarySheet(wb, data, options);
  buildTicketsSheet(wb, data, options);
  buildWorkloadSheet(wb, data);
  buildCommentsSheet(wb, data);
  buildAttachmentsSheet(wb, data);

  const raw = (await wb.xlsx.writeBuffer()) as ArrayBuffer | Uint8Array;
  const bytes = raw instanceof ArrayBuffer ? raw : raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  return injectPieCharts(bytes, 'Summary', charts);
}

export function exportFileName(date = todayIso()): string {
  return `it-tickets-report-${date}.xlsx`;
}

/** Builds the workbook and hands it to the browser as a download. */
export async function downloadTicketsWorkbook(data: ItTicketExport, options: TicketsExportOptions): Promise<void> {
  const bytes = await buildTicketsWorkbook(data, options);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
