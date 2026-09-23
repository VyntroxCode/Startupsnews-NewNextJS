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
    Email: l.email || '', Country: l.country || '', City: l.city || '', Source: l.source || '', Type: typeLabel, Query: l.query || '',
    'Assigned To': l.assignedTo || '', 'Current Status': l.status || '', 'Next Follow-up': l.nextFollowUpDate || '',
    'Last Connect Date': l.lastConnectDate || '', 'Last Call Discussion': l.lastCallDiscussion || '',
    // Populated only for Sponsor Event Page Leads — blank for every other row, same "-" convention
    // the unified All leads table uses on screen.
    'Event Title': l.eventTitle || '', 'Event Date': l.eventDate || '', 'Event Time': l.eventTime || '',
    'External URL': l.externalUrl || '', 'Poster': l.posterUrl || '', 'Event Description': l.description || '',
  };
}

export function emptyLead(): SalesLead {
  return {
    id: '', date: todayStr(), name: '', company: '', contact: '', email: '', country: '', city: '', source: '',
    type: 'Social Media', otherType: '', query: '', assignedTo: '', status: 'Query received',
    nextFollowUpDate: '', lastConnectDate: '', lastCallDiscussion: '',
    eventTitle: '', eventSlug: '', eventDate: '', eventTime: '', externalUrl: '', posterUrl: '', description: '',
  };
}
