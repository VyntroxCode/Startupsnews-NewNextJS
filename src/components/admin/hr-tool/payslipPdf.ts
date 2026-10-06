import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { COMPANY, amountToIndianWords } from './utils';
import type { PayslipData } from '@/modules/hr-tool/utils/payslip-data';

const PAGE_W = 595.28; // A4 @ 72dpi
const PAGE_H = 841.89;
const MARGIN = 42;
const INK = rgb(0.09, 0.11, 0.15);
const MUTED = rgb(0.45, 0.48, 0.55);
const LINE = rgb(0.85, 0.87, 0.9);
const GREEN_BG = rgb(0.90, 0.97, 0.94);
const GREEN_TEXT = rgb(0.13, 0.45, 0.31);
const ROW_BG = rgb(0.97, 0.97, 0.98);

export type { PayslipData };

export function fmtRs(n: number): string { return 'Rs. ' + Math.round(n).toLocaleString('en-IN'); }

/** The standard fonts only cover WinAnsi — one name in Devanagari (or an emoji, or ₹) made pdf-lib
 * throw and the whole payslip (or the whole ZIP) fail. Map what we can, drop the rest. */
function pdfSafe(str: string): string {
  return str
    .replace(/₹/g, 'Rs. ')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\u2013\u2014\u2022\u2026\u00A0-\u00FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Draws one payslip onto a fresh page of `doc` — used both for a single employee's own
 * download and for the admin's bulk "Download payslips (PDF)" (one page per employee). */
function drawPayslipPage(doc: PDFDocument, font: PDFFont, bold: PDFFont, logo: PDFImage | null, d: PayslipData): PDFPage {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const contentW = PAGE_W - MARGIN * 2;
  let y = PAGE_H - MARGIN;

  function text(str: string, x: number, yy: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: 'left' | 'right' } = {}) {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const safe = pdfSafe(str) || '-';
    const width = f.widthOfTextAtSize(safe, size);
    const drawX = opts.align === 'right' ? x - width : x;
    page.drawText(safe, { x: drawX, y: yy, size, font: f, color: opts.color ?? INK });
    return width;
  }
  function hr(yy: number, color = LINE) {
    page.drawLine({ start: { x: MARGIN, y: yy }, end: { x: PAGE_W - MARGIN, y: yy }, thickness: 0.75, color });
  }
  function rect(x: number, yy: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y: yy, width: w, height: h, color });
  }

  // Header: logo + company block (left), "Payslip For the Month" + label (right)
  if (logo) {
    const logoW = 100;
    const logoH = logoW * (logo.height / logo.width);
    page.drawImage(logo, { x: MARGIN, y: y - logoH, width: logoW, height: logoH });
  }
  text('Payslip For the Month', PAGE_W - MARGIN, y - 2, { size: 9, color: MUTED, align: 'right' });
  text(d.monthLabel, PAGE_W - MARGIN, y - 18, { size: 13, bold: true, align: 'right' });
  if (d.provisionalNote) text(d.provisionalNote, PAGE_W - MARGIN, y - 32, { size: 8, bold: true, color: rgb(0.72, 0.11, 0.11), align: 'right' });
  y -= 46;
  text(COMPANY.name, MARGIN, y, { size: 11, bold: true });
  y -= 14;
  text(COMPANY.address, MARGIN, y, { size: 8.5, color: MUTED });
  y -= 16;
  hr(y);
  y -= 22;

  text('EMPLOYEE SUMMARY', MARGIN, y, { size: 9, bold: true, color: MUTED });
  y -= 20;

  // Left column: labelled rows. Right column: green Total Net Pay box + Paid/LOP days.
  const leftRows: [string, string][] = [
    ['Employee Name', d.employeeName],
    ['Employee ID', d.employeeCode],
    ['Pay Period', d.monthLabel],
    ['Pay Date', d.payDateLabel],
  ];
  const boxX = MARGIN + 320;
  const boxW = contentW - 320;
  const boxTop = y + 6;
  rect(boxX, boxTop - 74, boxW, 74, GREEN_BG);
  text(fmtRs(d.netPay), boxX + 14, boxTop - 24, { size: 18, bold: true, color: GREEN_TEXT });
  text('Total Net Pay', boxX + 14, boxTop - 38, { size: 8.5, color: MUTED });
  hr(boxTop - 46, rgb(0.8, 0.88, 0.84));
  text('Paid Days', boxX + 14, boxTop - 58, { size: 8.5, color: MUTED });
  text(String(d.paidDays), boxX + boxW - 14, boxTop - 58, { size: 9, bold: true, align: 'right' });
  text('LOP Days', boxX + 14, boxTop - 70, { size: 8.5, color: MUTED });
  text(String(d.lopDays), boxX + boxW - 14, boxTop - 70, { size: 9, bold: true, align: 'right' });

  let ly = y;
  for (const [label, value] of leftRows) {
    text(label, MARGIN, ly, { size: 9.5, color: MUTED });
    text(value || '—', MARGIN + 110, ly, { size: 9.5, bold: true });
    ly -= 17;
  }
  y = Math.min(ly, boxTop - 74) - 14;
  hr(y);
  y -= 22;

  text('Designation', MARGIN, y, { size: 9.5, color: MUTED });
  text(d.designation || '—', MARGIN + 110, y, { size: 9.5, bold: true });
  text('Date Of Joining', MARGIN + contentW / 2, y, { size: 9.5, color: MUTED });
  text(d.dojLabel, MARGIN + contentW / 2 + 110, y, { size: 9.5, bold: true });
  y -= 30;

  // Earnings (left) / Deductions (right) two-column table
  const colW = (contentW - 30) / 2;
  const col2X = MARGIN + colW + 30;
  text('EARNINGS', MARGIN, y, { size: 9, bold: true, color: MUTED });
  text('AMOUNT', MARGIN + colW, y, { size: 9, bold: true, color: MUTED, align: 'right' });
  text('DEDUCTIONS', col2X, y, { size: 9, bold: true, color: MUTED });
  text('AMOUNT', col2X + colW, y, { size: 9, bold: true, color: MUTED, align: 'right' });
  y -= 10;
  hr(y);
  y -= 18;

  const earnings: [string, number][] = [
    ['Basic', d.basic],
    ['House Rent Allowance', d.hra],
    ['Conveyance', d.convenience],
    ['Spl Allowance', d.specialAllowance],
  ];
  const deductions: [string, number][] = [
    ['Income Tax', d.incomeTax],
    ['Provident Fund', d.providentFund],
  ];
  const rowsCount = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < rowsCount; i++) {
    if (earnings[i]) {
      text(earnings[i][0], MARGIN, y, { size: 9.5 });
      text(fmtRs(earnings[i][1]), MARGIN + colW, y, { size: 9.5, align: 'right' });
    }
    if (deductions[i]) {
      text(deductions[i][0], col2X, y, { size: 9.5 });
      text(fmtRs(deductions[i][1]), col2X + colW, y, { size: 9.5, align: 'right' });
    }
    y -= 18;
  }
  y -= 4;
  rect(MARGIN, y - 6, contentW, 22, ROW_BG);
  text('Gross Earnings', MARGIN + 6, y, { size: 9.5, bold: true });
  text(fmtRs(d.grossEarnings), MARGIN + colW, y, { size: 9.5, bold: true, align: 'right' });
  text('Total Deductions', col2X, y, { size: 9.5, bold: true });
  text(fmtRs(d.totalDeductions), col2X + colW, y, { size: 9.5, bold: true, align: 'right' });
  y -= 36;

  // Total Net Payable bar
  rect(MARGIN, y - 12, contentW, 34, GREEN_BG);
  text('TOTAL NET PAYABLE', MARGIN + 14, y + 6, { size: 10, bold: true });
  text('Gross Earnings - Total Deductions', MARGIN + 14, y - 6, { size: 8, color: MUTED });
  text(fmtRs(d.netPay), PAGE_W - MARGIN - 14, y, { size: 14, bold: true, color: GREEN_TEXT, align: 'right' });
  y -= 50;

  text(`Amount In Words : Indian Rupee ${amountToIndianWords(d.netPay)} Only`, MARGIN, y, { size: 9, color: MUTED });
  y -= 30;
  hr(y);
  y -= 20;
  const footer = 'This is a system-generated document.';
  const fw = font.widthOfTextAtSize(footer, 8.5);
  text(footer, MARGIN + (contentW - fw) / 2, y, { size: 8.5, color: MUTED });

  return page;
}

/** A fresh document with Helvetica (regular + bold) and the site logo — shared with fnfPdf.ts. */
export async function loadShared(): Promise<{ doc: PDFDocument; font: PDFFont; bold: PDFFont; logo: PDFImage | null }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  try {
    const res = await fetch('/logo.png');
    const bytes = await res.arrayBuffer();
    logo = await doc.embedPng(bytes);
  } catch {
    logo = null;
  }
  return { doc, font, bold, logo };
}

/** One employee's own payslip. */
export async function generatePayslipPdf(d: PayslipData): Promise<Uint8Array> {
  const { doc, font, bold, logo } = await loadShared();
  drawPayslipPage(doc, font, bold, logo, d);
  return doc.save();
}

/** "payslip_SNFYI-0004_Madhur-Mohan-Malik_2026-09.pdf" — safe on every OS, and unique within one
 * batch even when two people share a name or someone has no Employee ID yet. */
function payslipFilename(d: PayslipData, monthKey: string, taken: Set<string>): string {
  const clean = (s: string) => s.normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const code = clean(d.employeeCode === '—' ? '' : d.employeeCode);
  const base = ['payslip', code, clean(d.employeeName) || 'employee', monthKey].filter(Boolean).join('_');
  let name = `${base}.pdf`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base}_${n}.pdf`;
  taken.add(name.toLowerCase());
  return name;
}

/** Admin bulk download — one SEPARATE PDF per employee, delivered as a single ZIP (browsers block a
 * burst of individual downloads). The logo is fetched once and embedded into each document. */
export async function generatePayslipZip(list: PayslipData[], monthKey: string): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  let logoBytes: ArrayBuffer | null = null;
  try { logoBytes = await (await fetch('/logo.png')).arrayBuffer(); } catch { logoBytes = null; }
  const taken = new Set<string>();
  for (const d of list) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let logo: PDFImage | null = null;
    if (logoBytes) { try { logo = await doc.embedPng(logoBytes); } catch { logo = null; } }
    drawPayslipPage(doc, font, bold, logo, d);
    zip.file(payslipFilename(d, monthKey, taken), await doc.save());
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** File name for a single payslip download (same scheme as inside the ZIP). */
export function singlePayslipFilename(d: PayslipData, monthKey: string): string {
  return payslipFilename(d, monthKey, new Set());
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function triggerPdfDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
