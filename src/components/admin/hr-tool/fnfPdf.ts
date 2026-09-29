import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { COMPANY, amountToIndianWords } from './utils';
import { fmtRs, loadShared } from './payslipPdf';
import type { OffboardingFnf } from '@/modules/hr-offboarding/domain/types';

/*
 * Full & Final settlement statement — same look as the payslip (payslipPdf.ts), rendered client-side
 * with pdf-lib from data the server already computed. Used by HR (case window) and by the employee
 * (My Exit, once approved).
 */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const INK = rgb(0.09, 0.11, 0.15);
const MUTED = rgb(0.45, 0.48, 0.55);
const LINE = rgb(0.85, 0.87, 0.9);
const ROW_BG = rgb(0.97, 0.97, 0.98);
const GREEN_BG = rgb(0.90, 0.97, 0.94);
const GREEN_TEXT = rgb(0.13, 0.45, 0.31);
const RED_BG = rgb(0.99, 0.93, 0.93);
const RED_TEXT = rgb(0.72, 0.11, 0.11);

export interface FnfPdfData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  dojLabel: string;
  lwdLabel: string;
  exitTypeLabel: string;
  fnf: OffboardingFnf;
}

/** The standard fonts only cover WinAnsi — anything else (₹, emoji, Devanagari typed into a note)
 * would make pdf-lib throw and the download fail, so map what we can and drop the rest. */
function safe(str: string): string {
  return str
    .replace(/₹/g, 'Rs. ')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E–—•… -ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = safe(text).split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? current + ' ' + w : w;
    if (font.widthOfTextAtSize(candidate, size) <= width) { current = candidate; continue; }
    if (current) lines.push(current);
    // A single word wider than the column (a pasted URL, say) is hard-cut.
    let rest = w;
    while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function statusLine(f: OffboardingFnf): string {
  if (f.status === 'paid') return `Paid on ${f.paidOn} - reference ${f.reference}`;
  if (f.status === 'approved') return `Approved by ${f.approvedBy} on ${(f.approvedAt || '').slice(0, 10)} - payment pending`;
  return 'DRAFT - not approved, figures may change';
}

export async function generateFnfPdf(d: FnfPdfData): Promise<Uint8Array> {
  const { doc, font, bold, logo } = await loadShared();
  const contentW = PAGE_W - MARGIN * 2;
  const amountColW = 90;
  const descW = contentW - amountColW * 2 - 12;
  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const text = (str: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: 'left' | 'right' } = {}) => {
    const size = o.size ?? 10;
    const f = o.bold ? bold : font;
    const s = safe(str);
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: o.align === 'right' ? x - w : x, y: yy, size, font: f, color: o.color ?? INK });
  };
  const hr = (yy: number) => page.drawLine({ start: { x: MARGIN, y: yy }, end: { x: PAGE_W - MARGIN, y: yy }, thickness: 0.75, color: LINE });
  const rect = (x: number, yy: number, w: number, h: number, color: ReturnType<typeof rgb>) => page.drawRectangle({ x, y: yy, width: w, height: h, color });
  const ensureSpace = (needed: number) => {
    if (y - needed > MARGIN + 30) return;
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    text(`Full & Final Settlement - ${d.employeeName} (continued)`, MARGIN, y, { size: 9, color: MUTED });
    y -= 24;
  };

  // Header
  if (logo) {
    const logoW = 100;
    const logoH = logoW * (logo.height / logo.width);
    page.drawImage(logo, { x: MARGIN, y: y - logoH, width: logoW, height: logoH });
  }
  text('Full & Final Settlement', PAGE_W - MARGIN, y - 2, { size: 9, color: MUTED, align: 'right' });
  text(d.employeeName, PAGE_W - MARGIN, y - 18, { size: 13, bold: true, align: 'right' });
  y -= 46;
  text(COMPANY.name, MARGIN, y, { size: 11, bold: true });
  y -= 14;
  text(COMPANY.address, MARGIN, y, { size: 8.5, color: MUTED });
  y -= 16;
  hr(y);
  y -= 22;

  // Summary
  text('EMPLOYEE SUMMARY', MARGIN, y, { size: 9, bold: true, color: MUTED });
  y -= 18;
  const summary: [string, string][] = [
    ['Employee Name', d.employeeName], ['Employee ID', d.employeeCode || '-'], ['Designation', d.designation || '-'],
    ['Date of Joining', d.dojLabel], ['Last Working Day', d.lwdLabel], ['Separation', d.exitTypeLabel],
  ];
  for (let i = 0; i < summary.length; i += 2) {
    for (let j = 0; j < 2 && i + j < summary.length; j++) {
      const x = MARGIN + j * (contentW / 2);
      text(summary[i + j][0], x, y, { size: 9, color: MUTED });
      text(summary[i + j][1], x + 100, y, { size: 9.5, bold: true });
    }
    y -= 16;
  }
  y -= 8;
  hr(y);
  y -= 20;

  // Lines table
  rect(MARGIN, y - 6, contentW, 20, ROW_BG);
  text('Description', MARGIN + 6, y, { size: 9, bold: true });
  text('Earnings', MARGIN + contentW - amountColW - 6, y, { size: 9, bold: true, align: 'right' });
  text('Deductions', MARGIN + contentW - 6, y, { size: 9, bold: true, align: 'right' });
  y -= 22;
  for (const line of d.fnf.lines) {
    const wrapped = wrap(line.label, font, 9.5, descW);
    const rowH = wrapped.length * 13 + 10;
    ensureSpace(rowH);
    wrapped.forEach((w, i) => text(w, MARGIN + 6, y - i * 13, { size: 9.5 }));
    const amountX = line.kind === 'earning' ? MARGIN + contentW - amountColW - 6 : MARGIN + contentW - 6;
    text(fmtRs(line.amount), amountX, y, { size: 9.5, align: 'right' });
    y -= rowH;
    // Divider sits in the gap: below the last text line's descenders, above the next row's caps.
    hr(y + 15);
  }
  ensureSpace(140);
  y -= 6;
  rect(MARGIN, y - 6, contentW, 22, ROW_BG);
  text('Total', MARGIN + 6, y, { size: 9.5, bold: true });
  text(fmtRs(d.fnf.earnings), MARGIN + contentW - amountColW - 6, y, { size: 9.5, bold: true, align: 'right' });
  text(fmtRs(d.fnf.deductions), MARGIN + contentW - 6, y, { size: 9.5, bold: true, align: 'right' });
  y -= 40;

  // Net bar — green when the company pays, red when the employee owes
  const owes = d.fnf.net < 0;
  rect(MARGIN, y - 12, contentW, 34, owes ? RED_BG : GREEN_BG);
  text(owes ? 'NET RECOVERABLE FROM EMPLOYEE' : 'NET PAYABLE TO EMPLOYEE', MARGIN + 14, y + 6, { size: 10, bold: true });
  text('Total Earnings - Total Deductions', MARGIN + 14, y - 6, { size: 8, color: MUTED });
  text(fmtRs(Math.abs(d.fnf.net)), PAGE_W - MARGIN - 14, y, { size: 14, bold: true, color: owes ? RED_TEXT : GREEN_TEXT, align: 'right' });
  y -= 44;
  text(`Amount In Words : Indian Rupee ${amountToIndianWords(Math.abs(d.fnf.net))} Only`, MARGIN, y, { size: 9, color: MUTED });
  y -= 18;
  text(statusLine(d.fnf), MARGIN, y, { size: 9, bold: true, color: d.fnf.status === 'draft' ? RED_TEXT : INK });
  y -= 26;
  hr(y);
  y -= 18;
  const footer = 'This is a system-generated document.';
  text(footer, MARGIN + (contentW - font.widthOfTextAtSize(footer, 8.5)) / 2, y, { size: 8.5, color: MUTED });

  return doc.save();
}
