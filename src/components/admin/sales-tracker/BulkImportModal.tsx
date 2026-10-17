'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, TriangleAlert, Upload, X } from 'lucide-react';
import { MANUAL_LEAD_TYPES } from '@/modules/sales-tracker/domain/types';
import { SALES_LEAD_STATUS_LABELS } from '@/modules/lead-assignments/domain/types';
import { localToday } from '@/modules/lead-followups/domain/follow-up-date';
import {
  LEAD_IMPORT_COLUMNS,
  MAX_LEAD_IMPORT_ROWS,
  findLeadHeaderRow,
  leadImportFingerprint,
  mapLeadHeaders,
  parseLeadImportRow,
  type LeadImportRaw,
} from '@/modules/sales-tracker/utils/import-columns';
import { salesTrackerApi } from './api';
import type { SalesLead } from './types';

interface ParsedFile {
  fileName: string;
  sheetName: string;
  rows: LeadImportRaw[];
  /** Spreadsheet row number (1-based) of each entry in `rows`. */
  rowNumbers: number[];
  /** Template headers of the optional columns the file doesn't have. */
  missingOptional: string[];
  ignoredHeaders: string[];
}

interface ImportResult {
  inserted: number;
  invalid: { row: number; reason: string }[];
}

function tomorrow(): string {
  const [y, m, d] = localToday().split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

/** The template: the headers with one example lead, plus a "How to fill" sheet. */
function downloadTemplate() {
  const header = LEAD_IMPORT_COLUMNS.map((c) => c.header);
  const sheet = XLSX.utils.aoa_to_sheet([header, LEAD_IMPORT_COLUMNS.map((c) => c.example)]);
  sheet['!cols'] = header.map((h) => ({ wch: Math.max(16, h.length + 4) }));
  const blankRule: Record<string, string> = {
    date: 'The day the sheet is uploaded',
    name: 'Left empty (each row needs at least a Name, Company, Phone or Email)',
    company: 'Left empty (each row needs at least a Name, Company, Phone or Email)',
    contact: 'Left empty (each row needs at least a Name, Company, Phone or Email)',
    email: 'Left empty (each row needs at least a Name, Company, Phone or Email)',
    status: 'Pending',
    type: 'The default type picked in the Import leads window',
    nextFollowUpDate: 'The default date picked in the Import leads window (Pending / Follow Up only)',
  };
  const allowed: Record<string, string> = {
    date: 'A date, e.g. 2026-10-15',
    nextFollowUpDate: 'A date, e.g. 2026-10-20',
    email: 'A valid email address',
    type: `${MANUAL_LEAD_TYPES.join(' / ')} — any other text is saved as Others with that text`,
    status: SALES_LEAD_STATUS_LABELS.join(' / '),
  };
  const guide = XLSX.utils.aoa_to_sheet([
    ['Column', 'What to put in it', 'If left blank'],
    ...LEAD_IMPORT_COLUMNS.map((c) => [
      c.header,
      allowed[c.key] ?? `Text, e.g. ${c.example}`,
      blankRule[c.key] ?? 'Left empty',
    ]),
    [],
    ['Every column is optional. A row with no Name, Company, Phone and Email is skipped.'],
  ]);
  guide['!cols'] = [{ wch: 22 }, { wch: 60 }, { wch: 60 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Leads');
  XLSX.utils.book_append_sheet(book, guide, 'How to fill');
  XLSX.writeFile(book, 'startupnews-sales-leads-import-template.xlsx');
}

/** Reads the first sheet that has a recognisable header row. Throws the message to show. */
async function parseFile(file: File): Promise<ParsedFile> {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  } catch {
    throw new Error('Could not read this file. Save it as .xlsx or .xls and try again.');
  }
  for (const sheetName of book.SheetNames) {
    // Raw values: date cells arrive as Excel serial numbers, which normalizeDate converts without
    // the timezone shift a JS Date would carry.
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, blankrows: false, defval: '' });
    const headerIdx = findLeadHeaderRow(aoa);
    if (headerIdx < 0) continue;

    const headerRow = aoa[headerIdx];
    const keys = mapLeadHeaders(headerRow);

    const rows: LeadImportRaw[] = [];
    const rowNumbers: number[] = [];
    for (let r = headerIdx + 1; r < aoa.length; r++) {
      const line = aoa[r] ?? [];
      if (!line.some((cell) => String(cell ?? '').trim())) continue;
      const raw: LeadImportRaw = {};
      keys.forEach((key, i) => { if (key) raw[key] = line[i]; });
      rows.push(raw);
      rowNumbers.push(r + 1);
    }
    if (!rows.length) throw new Error('The file has the headers but no leads under them.');
    if (rows.length > MAX_LEAD_IMPORT_ROWS) {
      throw new Error(`The file has ${rows.length.toLocaleString()} leads. Import at most ${MAX_LEAD_IMPORT_ROWS.toLocaleString()} at a time — split it into smaller files.`);
    }
    return {
      fileName: file.name,
      sheetName,
      rows,
      rowNumbers,
      missingOptional: LEAD_IMPORT_COLUMNS.filter((c) => !keys.includes(c.key)).map((c) => c.header),
      ignoredHeaders: headerRow.filter((h, i) => !keys[i] && String(h ?? '').trim()).map((h) => String(h).trim()),
    };
  }
  throw new Error('No sheet in this file has the lead column headers (Name, Email, Phone …). Download the template to see the expected headers.');
}

/** Sales Tracker › Import leads: reads an Excel file in the browser, shows every row with its
 * state (ready / reason it will be skipped / "Already exists" when every field matches a stored
 * lead or an earlier row), and sends the ticked rows to the import route. Imported leads arrive
 * unassigned; they're assigned from the lead window like any other lead. The frame and buttons are
 * the page's shared .modal-* styles; the content is Tailwind. */
export default function BulkImportModal({ existingLeads, onImported, onClose }: {
  existingLeads: SalesLead[];
  onImported: (leads: SalesLead[]) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [defaultType, setDefaultType] = useState<string>(MANUAL_LEAD_TYPES[0]);
  const [defaultFollowUpDate, setDefaultFollowUpDate] = useState(tomorrow);
  /** Spreadsheet rows the admin unticked. */
  const [unticked, setUnticked] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  /** The upload day: what a row with a blank Date is stored with (the server uses its own clock). */
  const [uploadDay] = useState(localToday);

  const existingFingerprints = useMemo(() => new Set(existingLeads.map(leadImportFingerprint)), [existingLeads]);

  // Re-parsed when a default changes, so the preview always shows what will be stored.
  const preview = useMemo(() => {
    if (!file) return [];
    const seen = new Set<string>();
    return file.rows.map((raw, i) => {
      const { fields, error } = parseLeadImportRow(raw, { date: uploadDay, type: defaultType, nextFollowUpDate: defaultFollowUpDate });
      const print = leadImportFingerprint(fields);
      const duplicate = error ? null : existingFingerprints.has(print) ? 'Already exists' : seen.has(print) ? 'Repeated in this file' : null;
      seen.add(print);
      return { row: file.rowNumbers[i], raw, fields, error, duplicate };
    });
  }, [file, uploadDay, defaultType, defaultFollowUpDate, existingFingerprints]);

  const selected = preview.filter((p) => !p.error && !unticked.has(p.row));
  const errorCount = preview.filter((p) => p.error).length;
  const duplicateCount = preview.filter((p) => p.duplicate).length;

  async function pickFile(list: FileList | null) {
    const picked = list?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!picked) return;
    setFileError('');
    setImportError('');
    setResult(null);
    setUnticked(new Set());
    if (!/\.(xlsx|xls)$/i.test(picked.name)) { setFile(null); setFileError('Please upload an Excel file (.xlsx or .xls).'); return; }
    setReading(true);
    try {
      setFile(await parseFile(picked));
    } catch (error) {
      setFile(null);
      setFileError(error instanceof Error ? error.message : 'Could not read this file.');
    }
    setReading(false);
  }

  function toggle(row: number) {
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row); else next.add(row);
      return next;
    });
  }

  async function runImport() {
    if (!file || !selected.length) return;
    setImporting(true);
    setImportError('');
    try {
      const data = await salesTrackerApi.importLeads({
        fileName: file.fileName,
        rows: selected.map((p) => p.raw),
        rowNumbers: selected.map((p) => p.row),
        defaultType,
        defaultFollowUpDate,
      });
      onImported(data.leads);
      setResult({ inserted: data.leads.length, invalid: data.invalid });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed. Try again.');
    }
    setImporting(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose(); }}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="st-import-title">
        <div className="modal-head">
          <div className="min-w-0">
            <h2 id="st-import-title">Import leads from Excel</h2>
            <p className="m-0 mt-1 text-[13px] leading-snug text-slate-500">
              Every row becomes a new lead, unassigned. Assign them from All leads afterwards, the same as any other lead.
            </p>
          </div>
          <button type="button" className="tw inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 hover:bg-slate-100" aria-label="Close" disabled={importing} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body flex flex-col gap-4 pb-5!">
          {result ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>
                  <b>{result.inserted.toLocaleString()}</b> {result.inserted === 1 ? 'lead' : 'leads'} added to All leads from {file?.fileName}.
                  {result.invalid.length > 0 && <> {result.invalid.length.toLocaleString()} {result.invalid.length === 1 ? 'row was' : 'rows were'} not added.</>}
                </span>
              </div>
              {result.invalid.length > 0 && (
                <ul className="m-0 list-none rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  {result.invalid.map((i) => <li key={i.row}>Row {i.row}: {i.reason}</li>)}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 text-[13px] text-slate-600">
                  <p className="m-0 mb-2">Columns the file can have — all optional. Each row needs at least a Name, Company, Phone or Email; a blank Date gets today&apos;s date.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {LEAD_IMPORT_COLUMNS.map((c) => (
                      <span key={c.key} className="rounded-md border border-solid border-slate-200 bg-white px-2 py-0.5 text-[11.5px] text-slate-600">
                        {c.header}
                      </span>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={downloadTemplate}>
                  <span className="inline-flex items-center gap-1.5"><Download size={15} /> Download template</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); void pickFile(e.dataTransfer.files); }}
                className={`tw box-border flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${dragOver ? 'border-[#E01552] bg-[#FDEBF1]' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
              >
                {reading ? <Loader2 size={26} className="animate-spin text-slate-400" /> : <Upload size={26} className="text-slate-400" />}
                <span className="text-sm text-slate-700"><b className="font-semibold">Click to upload</b> or drag an Excel file here</span>
                <span className="text-xs text-slate-500">.xlsx or .xls · up to {MAX_LEAD_IMPORT_ROWS.toLocaleString()} leads per file</span>
              </button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => void pickFile(e.target.files)} />

              {fileError && <p className="m-0 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><TriangleAlert size={16} className="mt-0.5 shrink-0" />{fileError}</p>}

              {file && (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-600">
                    <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                      <FileSpreadsheet size={18} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{file.fileName}</span>
                    </span>
                    <span>Sheet “{file.sheetName}” · {file.rows.length.toLocaleString()} rows</span>
                  </div>
                  {(file.missingOptional.length > 0 || file.ignoredHeaders.length > 0) && (
                    <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {file.missingOptional.length > 0 && <span>Not in your file (left blank{file.missingOptional.includes('Date') ? '; Date = today' : ''}): {file.missingOptional.join(', ')}</span>}
                      {file.ignoredHeaders.length > 0 && <span>Ignored columns: {file.ignoredHeaders.join(', ')}</span>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
                    <div>
                      <label htmlFor="st-import-type" className="mb-1.5 block text-[13px] font-semibold text-slate-700">Type of lead when the cell is blank</label>
                      <select id="st-import-type" value={defaultType} onChange={(e) => setDefaultType(e.target.value)}>
                        {MANUAL_LEAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="st-import-date" className="mb-1.5 block text-[13px] font-semibold text-slate-700">Next follow-up date when the cell is blank</label>
                      <input id="st-import-date" type="date" value={defaultFollowUpDate} onChange={(e) => setDefaultFollowUpDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{selected.length.toLocaleString()} ready to import</span>
                    {errorCount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">{errorCount.toLocaleString()} will be skipped</span>}
                    {duplicateCount > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{duplicateCount.toLocaleString()} already exist — untick to leave out</span>}
                  </div>

                  <div className="max-h-[420px] overflow-auto rounded-lg border border-solid border-slate-200">
                    <table className="w-full min-w-[1180px] border-collapse text-[13px]">
                      <thead>
                        <tr>
                          <th className="w-10"><span className="sr-only">Import</span></th>
                          <th>Row</th>
                          <th>Date</th>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Country</th>
                          <th>Source</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Next follow-up</th>
                          <th>Check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((p) => (
                          <tr key={p.row} className={p.error ? 'bg-red-50/60' : p.duplicate ? 'bg-amber-50/60' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Import row ${p.row}`}
                                className="h-4 w-4 cursor-pointer accent-[#E01552] disabled:cursor-not-allowed"
                                disabled={!!p.error}
                                checked={!p.error && !unticked.has(p.row)}
                                onChange={() => toggle(p.row)}
                              />
                            </td>
                            <td className="text-slate-400">{p.row}</td>
                            <td className="whitespace-nowrap">{p.fields.date || '—'}</td>
                            <td className="font-semibold">{p.fields.name || '—'}</td>
                            <td>{p.fields.company || '—'}</td>
                            <td className="whitespace-nowrap">{p.fields.contact || '—'}</td>
                            <td>{p.fields.email || '—'}</td>
                            <td>{p.fields.country || '—'}</td>
                            <td>{p.fields.source || '—'}</td>
                            <td>{p.fields.type === 'Others' && p.fields.otherType ? `Others: ${p.fields.otherType}` : p.fields.type}</td>
                            <td className="whitespace-nowrap">{p.fields.status}</td>
                            <td className="whitespace-nowrap">{p.fields.nextFollowUpDate || '—'}</td>
                            <td className="min-w-[200px]">
                              {p.error
                                ? <span className="text-xs font-medium text-red-700">{p.error}</span>
                                : p.duplicate
                                  ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{p.duplicate}</span>
                                  : <span className="text-xs font-medium text-emerald-700">Ready</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {importError && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>}
            </>
          )}
        </div>

        <div className="modal-actions">
          {result ? (
            <button type="button" className="primary" onClick={onClose}>Done</button>
          ) : (
            <>
              <button type="button" disabled={importing} onClick={onClose}>Cancel</button>
              <button type="button" className="primary" disabled={importing || !selected.length} onClick={() => void runImport()}>
                {importing ? 'Importing…' : `Import ${selected.length.toLocaleString()} ${selected.length === 1 ? 'lead' : 'leads'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
