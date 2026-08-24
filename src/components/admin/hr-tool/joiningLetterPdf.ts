import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { COMPANY, amountToIndianWords, ordinalDate, todayStr, type OfferLetterData } from './utils';

const PAGE_W = 595.28; // A4 @ 72dpi
const PAGE_H = 841.89;
const MARGIN = 54;
const INK = rgb(0.09, 0.11, 0.15);
const MUTED = rgb(0.42, 0.46, 0.53);
const LINE = rgb(0.8, 0.83, 0.87);

/** The Standard-14 PDF fonts pdf-lib embeds here only cover WinAnsi — no ₹ glyph — so the PDF
 * spells out "Rs." instead of the ₹ symbol used on-screen. Embedding a custom Unicode font just
 * for one glyph isn't worth the added bundle/fetch cost. */
function fmtRs(n: number): string { return 'Rs. ' + n.toLocaleString('en-IN'); }

/** Replaces any character the WinAnsi-encoded standard fonts can't draw (₹ being the one that
 * actually shows up here — HR's custom "Offer Letter" template merges in a ₹-prefixed CTC figure
 * — plus, defensively, anything else an admin might paste into a custom template or free-text
 * field) with a safe fallback, instead of letting pdf-lib throw partway through the document. */
function sanitizeForPdf(text: string, font: PDFFont): string {
  if (!/[^\x00-\x7F]/.test(text)) return text;
  let out = '';
  for (const ch of text) {
    if (/[\x00-\x7F]/.test(ch)) { out += ch; continue; }
    if (ch === '₹') { out += 'Rs.'; continue; }
    try {
      font.widthOfTextAtSize(ch, 10);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

/** Small stateful cursor over a growing set of A4 pages — handles line wrapping and pagination
 * so callers can just describe the letter top-to-bottom without worrying about page breaks. */
class LetterPdfWriter {
  private constructor(private doc: PDFDocument, private font: PDFFont, private bold: PDFFont, private logo: PDFImage | null) {
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }
  private page: PDFPage;
  private y: number;
  readonly contentW = PAGE_W - MARGIN * 2;

  static async create(): Promise<LetterPdfWriter> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    // Best-effort — a failed fetch (offline, blocked asset, etc.) shouldn't stop the letter from
    // generating, it just comes out without the letterhead image.
    let logo: PDFImage | null = null;
    try {
      const res = await fetch('/logo.png');
      const bytes = await res.arrayBuffer();
      logo = await doc.embedPng(bytes);
    } catch {
      logo = null;
    }
    return new LetterPdfWriter(doc, font, bold, logo);
  }

  private newPage(): void {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  private ensureSpace(h: number): void {
    if (this.y - h < MARGIN) this.newPage();
  }

  private wrap(str: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = str.split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && font.widthOfTextAtSize(test, size) > maxWidth) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  gap(h: number): void { this.y -= h; }

  /** Draws the company logo (if it loaded) at the top-left, preserving its aspect ratio, and
   * advances the cursor past it. A no-op if the fetch failed. */
  logoImage(width = 140): void {
    if (!this.logo) return;
    const height = width * (this.logo.height / this.logo.width);
    this.ensureSpace(height);
    this.page.drawImage(this.logo, { x: MARGIN, y: this.y - height, width, height });
    this.y -= height;
  }

  text(str: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; align?: 'left' | 'right' | 'center'; gapAfter?: number } = {}): void {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const indent = opts.indent ?? 0;
    const maxWidth = this.contentW - indent;
    const lineHeight = size * 1.4;
    for (const line of this.wrap(sanitizeForPdf(str, this.font), font, size, maxWidth)) {
      this.ensureSpace(lineHeight);
      const lineWidth = font.widthOfTextAtSize(line, size);
      const x = opts.align === 'right' ? PAGE_W - MARGIN - lineWidth
        : opts.align === 'center' ? MARGIN + (this.contentW - lineWidth) / 2
        : MARGIN + indent;
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= lineHeight;
    }
    this.y -= opts.gapAfter ?? 0;
  }

  hr(color = LINE, thickness = 0.75): void {
    this.ensureSpace(thickness + 2);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness, color });
  }

  /** Two labels sharing one line, evenly spread — used for the blank Place/Signature line. */
  splitRow(left: string, right: string, size = 10): void {
    this.ensureSpace(size * 1.4);
    this.page.drawText(sanitizeForPdf(left, this.font), { x: MARGIN, y: this.y - size, size, font: this.font, color: INK });
    const rightWidth = this.font.widthOfTextAtSize(right, size);
    this.page.drawText(sanitizeForPdf(right, this.font), { x: PAGE_W - MARGIN - rightWidth, y: this.y - size, size, font: this.font, color: INK });
    this.y -= size * 1.4;
  }

  async finish(): Promise<Uint8Array> { return this.doc.save(); }
}

/** Renders the exact same content as `buildOfferLetterContent` — the company's actual
 * offer-letter template (logo, a single offer paragraph with the annual compensation spelled
 * out in words, a portal-login line, the document checklist, and the standard
 * acceptance/closing) — as a properly typeset, paginated A4 PDF instead of a plain-text dump.
 * Deliberately doesn't itemize the CTC split (Basic/HRA/Convenience) the way the internal
 * Payroll/CTC Structure tooling does — that breakdown is for payroll math, not this letter. */
export async function generateJoiningLetterPdf(d: OfferLetterData): Promise<Uint8Array> {
  const w = await LetterPdfWriter.create();
  const dateStr = ordinalDate(todayStr());
  const firstName = d.employeeName.trim().split(/\s+/)[0] || d.employeeName;
  const ctcWords = amountToIndianWords(d.ctc);

  w.logoImage();
  w.gap(24);

  w.text('Date: ' + dateStr, { bold: true, align: 'right', gapAfter: 24 });

  w.text(`Offer Letter : "${d.designation}"`, { size: 13, bold: true, align: 'center', gapAfter: 24 });

  w.text(`Dear ${firstName},`, { gapAfter: 10 });

  w.text(
    `With reference to your application & subsequent Interview we had with you, we are pleased to offer you employment as "${d.designation}" in our organization. Your joining date is ${ordinalDate(d.doj, false)}, and Your Annual Compensation will be ${fmtRs(d.ctc)}/- (${ctcWords} Only) and you will be on a probation of 3 months.`,
    { gapAfter: 10 }
  );

  w.text(
    `You will be able to track your onboarding via our Employee Portal — sign in with Employee ID ${d.employeeCode} and password ${d.password} (please change it after your first login).`,
    { gapAfter: 10 }
  );

  w.text('You are requested to share following documents for completion of processes:', { gapAfter: 4 });
  if (d.requiredDocuments.length) {
    d.requiredDocuments.forEach((doc) => w.text(`•  ${doc}`, { indent: 10, gapAfter: 2 }));
  } else {
    w.text('•  (to be communicated by HR)', { indent: 10, gapAfter: 2 });
  }
  w.gap(6);

  w.text('Please confirm your acceptance to this Offer. On completion of these Documents, your joining would be completed.', { gapAfter: 10 });
  w.text('Kindly check and return a copy of duly signed Appointment Letter in acceptance of the terms and conditions mentioned after receiving.', { gapAfter: 40 });

  w.text('_______________________', { gapAfter: 2 });
  w.text('Authorised Signatory', { size: 9.5, color: MUTED, gapAfter: 14 });

  w.text('Warm Regards;', { gapAfter: 2 });
  w.text(COMPANY.brand, { gapAfter: 28 });

  w.text(`I agree to become part of Team ${COMPANY.brand} on the terms and conditions mentioned in the letter.`, { gapAfter: 24 });
  w.splitRow('Place: _______________', 'Signature: _______________');
  w.text('Date: _______________', { gapAfter: 30 });

  w.hr();
  w.gap(10);
  w.text(COMPANY.name, { size: 8.5, color: MUTED });
  w.text(COMPANY.cin, { size: 8.5, color: MUTED });
  w.text(COMPANY.address, { size: 8.5, color: MUTED });
  w.text(COMPANY.email, { size: 8.5, color: MUTED });

  return w.finish();
}

/** Fallback for when HR has drafted a fully custom "Offer Letter" template in Company Profile —
 * there's no structured data to lay out a table from, so this just paginates the merged plain
 * text as-is (still a real, properly wrapped/paginated PDF, not a screenshot of a text box). */
export async function generatePlainLetterPdf(text: string): Promise<Uint8Array> {
  const w = await LetterPdfWriter.create();
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { w.gap(10); continue; }
    w.text(paragraph, { size: 10, gapAfter: 4 });
  }
  return w.finish();
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
