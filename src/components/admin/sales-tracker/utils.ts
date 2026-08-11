import { COUNTRY_CODES } from './constants';
import type { SalesLead } from './types';

export function todayStr(): string { return new Date().toISOString().slice(0, 10); }

export function csvCell(v: unknown): string {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Dynamically loads a CDN script exactly once — used for the Excel/PDF export libraries,
 * which aren't npm dependencies on this page. */
export function loadScriptOnce(src: string, isAlreadyLoaded: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAlreadyLoaded()) return resolve();
    const existing = document.querySelector(`script[data-dyn-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.dataset.dynSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

export function leadExportRow(l: SalesLead): Record<string, string> {
  const typeLabel = l.type === 'Others' && l.otherType ? `Others: ${l.otherType}` : (l.type || '');
  return {
    Date: l.date || '', Name: l.name || '', Company: l.company || '', Contact: l.contact || '',
    Email: l.email || '', Source: l.source || '', Type: typeLabel, Query: l.query || '',
    'Assigned To': l.assignedTo || '', 'Current Status': l.status || '', 'Next Follow-up': l.nextFollowUpDate || '',
    'Last Connect Date': l.lastConnectDate || '', 'Last Call Discussion': l.lastCallDiscussion || '',
  };
}

export function parseContactValue(raw: string): { code: string; custom: string; number: string } {
  const trimmed = (raw || '').trim();
  const m = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!m) return { code: '+91', custom: '', number: trimmed.replace(/\D/g, '') };
  const code = m[1];
  const digits = m[2].replace(/\D/g, '');
  if (COUNTRY_CODES.includes(code)) return { code, custom: '', number: digits };
  return { code: 'other', custom: code, number: digits };
}

export function emptyLead(): SalesLead {
  return {
    id: '', date: todayStr(), name: '', company: '', contact: '', email: '', source: '',
    type: 'Social Media', otherType: '', query: '', assignedTo: '', status: 'Query received',
    nextFollowUpDate: '', lastConnectDate: '', lastCallDiscussion: '',
  };
}
