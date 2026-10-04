'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, TriangleAlert, Upload, X } from 'lucide-react';
import { getAuthHeaders } from '@/lib/admin-auth';
import {
  FUNDING_COLUMNS,
  buildDedupeKey,
  findHeaderRow,
  mapHeaders,
  normalizeDealInput,
  validateDealInput,
  type FundingColumnKey,
} from '@/modules/funding-deals/utils/columns';
import { parseAmountToUsdMn } from '@/modules/funding-deals/utils/parse-amount';
import { formatDealDate, formatUsdMn } from '@/modules/funding-deals/utils/format';
import { btnPrimary, btnSecondary, cardCls, stagePill } from './ui';

type RawRow = Partial<Record<FundingColumnKey, unknown>>;

interface ParsedFile {
  id: string;
  fileName: string;
  sheetName: string;
  rows: RawRow[];
  /** Spreadsheet row number (1-based) of each entry in `rows`. */
  rowNumbers: number[];
  matched: { key: FundingColumnKey; header: string }[];
  ignoredHeaders: string[];
  invalid: { row: number; reason: string }[];
  duplicatesInFile: number;
  /** Set when the file couldn't be used at all. */
  error?: string;
  result?: { inserted: number; skippedDuplicates: number; invalid: { row: number; reason: string }[] };
  importError?: string;
}

function downloadTemplate() {
  const header = FUNDING_COLUMNS.map((c) => c.header);
  const example = FUNDING_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([header, example]);
  sheet['!cols'] = header.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Funding deals');
  XLSX.writeFile(book, 'startupnews-funding-upload-template.xlsx');
}

async function parseFile(file: File): Promise<ParsedFile> {
  const base: ParsedFile = {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    fileName: file.name,
    sheetName: '',
    rows: [],
    rowNumbers: [],
    matched: [],
    ignoredHeaders: [],
    invalid: [],
    duplicatesInFile: 0,
  };
  try {
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    for (const sheetName of book.SheetNames) {
      // Raw values: date cells arrive as Excel serial numbers, which normalizeDate converts without
      // the timezone shift a JS Date would carry.
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, blankrows: false, defval: '' });
      const headerIdx = findHeaderRow(aoa);
      if (headerIdx < 0) continue;

      const headerRow = aoa[headerIdx];
      const keys = mapHeaders(headerRow);
      const matched: ParsedFile['matched'] = [];
      const ignoredHeaders: string[] = [];
      keys.forEach((key, i) => {
        const header = String(headerRow[i] ?? '').trim();
        if (key) matched.push({ key, header });
        else if (header) ignoredHeaders.push(header);
      });

      const rows: RawRow[] = [];
      const rowNumbers: number[] = [];
      const invalid: ParsedFile['invalid'] = [];
      const seen = new Set<string>();
      let duplicatesInFile = 0;
      for (let r = headerIdx + 1; r < aoa.length; r++) {
        const line = aoa[r] ?? [];
        if (!line.some((cell) => String(cell ?? '').trim())) continue;
        const raw: RawRow = {};
        keys.forEach((key, i) => { if (key) raw[key] = line[i]; });
        const rowNumber = r + 1;
        rows.push(raw);
        rowNumbers.push(rowNumber);

        const clean = normalizeDealInput(raw);
        const reason = validateDealInput(clean);
        if (reason) { invalid.push({ row: rowNumber, reason }); continue; }
        const key = buildDedupeKey(clean);
        if (seen.has(key)) duplicatesInFile += 1;
        else seen.add(key);
      }
      return { ...base, sheetName, rows, rowNumbers, matched, ignoredHeaders, invalid, duplicatesInFile };
    }
    return { ...base, error: 'No sheet has a header row with both a "Date" and a "Startup Name" column. Download the template to see the expected headers.' };
  } catch {
    return { ...base, error: 'Could not read this file. Save it as .xlsx, .xls or .csv and try again.' };
  }
}

/** Admin › Funding Data › Bulk Upload — parse Excel/CSV in the browser, preview, then import. */
export default function BulkUpload({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setReading(true);
    const parsed = await Promise.all(
      Array.from(list)
        .filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name))
        .map(parseFile),
    );
    setFiles((prev) => [...prev.filter((p) => !parsed.some((n) => n.id === p.id)), ...parsed]);
    setReading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pending = files.filter((f) => !f.error && !f.result && f.rows.length);
  const validCount = (f: ParsedFile) => f.rows.length - f.invalid.length;

  const importAll = async () => {
    setImporting(true);
    let anyInserted = false;
    for (const file of pending) {
      try {
        const res = await fetch('/api/admin/funding-deals/import', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ fileName: file.fileName, rows: file.rows, rowNumbers: file.rowNumbers }),
        });
        const json = await res.json();
        setFiles((prev) => prev.map((p) => p.id === file.id
          ? (json.success ? { ...p, result: json.data } : { ...p, importError: json.error || 'Import failed.' })
          : p));
        if (json.success && json.data.inserted > 0) anyInserted = true;
      } catch {
        setFiles((prev) => prev.map((p) => (p.id === file.id ? { ...p, importError: 'Network error — try again.' } : p)));
      }
    }
    setImporting(false);
    if (anyInserted) onImported();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className={`${cardCls} p-5`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-slate-900">Upload Excel / CSV</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Headers are matched automatically. <b className="font-semibold text-slate-700">Date</b> and <b className="font-semibold text-slate-700">Startup Name</b> are required; a deal with the same date, startup and stage is skipped, never duplicated.
            </p>
          </div>
          <button type="button" className={btnSecondary} onClick={downloadTemplate}>
            <Download size={16} /> Sample template
          </button>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
          className={`box-border flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${dragOver ? 'border-[#E01552] bg-[#FDEBF1]' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
        >
          {reading ? <Loader2 size={28} className="animate-spin text-slate-400" /> : <Upload size={28} className="text-slate-400" />}
          <span className="text-sm text-slate-700"><b className="font-semibold">Click to upload</b> or drag files here</span>
          <span className="text-xs text-slate-500">.xlsx, .xls, .csv — several files at once is fine</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />

        <div className="mt-4">
          <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recognised columns</p>
          <div className="flex flex-wrap gap-1.5">
            {FUNDING_COLUMNS.map((c) => (
              <span key={c.key} className="rounded-md border border-solid border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                {c.header}{c.required ? ' *' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {files.map((f) => (
        <div key={f.id} className={`${cardCls} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-0 border-b border-solid border-slate-200 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet size={20} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold text-slate-900">{f.fileName}</p>
                <p className="m-0 text-xs text-slate-500">
                  {f.error ? 'Not usable' : `Sheet “${f.sheetName}” · ${f.rows.length.toLocaleString()} rows · ${validCount(f).toLocaleString()} ready`}
                </p>
              </div>
            </div>
            {!f.result && (
              <button type="button" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 hover:bg-slate-100" aria-label="Remove file" onClick={() => setFiles((prev) => prev.filter((p) => p.id !== f.id))}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            {f.error && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{f.error}</p>}

            {f.result && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>
                  <b>{f.result.inserted.toLocaleString()}</b> deals added
                  {f.result.skippedDuplicates > 0 && <> · {f.result.skippedDuplicates.toLocaleString()} duplicates skipped</>}
                  {f.result.invalid.length > 0 && <> · {f.result.invalid.length.toLocaleString()} rows rejected</>}
                  . Undo it from Upload History if needed.
                </span>
              </div>
            )}
            {f.importError && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{f.importError}</p>}

            {!f.error && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {f.matched.map((m) => (
                    <span key={m.key} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      {m.header} → {FUNDING_COLUMNS.find((c) => c.key === m.key)?.header}
                    </span>
                  ))}
                  {f.ignoredHeaders.map((h) => (
                    <span key={h} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 line-through">{h}</span>
                  ))}
                </div>

                {(f.invalid.length > 0 || f.duplicatesInFile > 0) && !f.result && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <p className="m-0 flex items-center gap-1.5 font-semibold">
                      <TriangleAlert size={14} />
                      {f.invalid.length > 0 && `${f.invalid.length.toLocaleString()} rows will be skipped`}
                      {f.invalid.length > 0 && f.duplicatesInFile > 0 && ' · '}
                      {f.duplicatesInFile > 0 && `${f.duplicatesInFile.toLocaleString()} repeated rows in this file`}
                    </p>
                    {f.invalid.length > 0 && (
                      <ul className="m-0 mt-1 list-none p-0">
                        {f.invalid.slice(0, 8).map((i) => <li key={i.row}>Row {i.row}: {i.reason}</li>)}
                        {f.invalid.length > 8 && <li>…and {(f.invalid.length - 8).toLocaleString()} more</li>}
                      </ul>
                    )}
                  </div>
                )}

                {!f.result && f.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2 font-semibold">Row</th>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">Startup</th>
                          <th className="px-3 py-2 font-semibold">Sector</th>
                          <th className="px-3 py-2 font-semibold">Stage</th>
                          <th className="px-3 py-2 font-semibold">Amount</th>
                          <th className="px-3 py-2 font-semibold">City / Country</th>
                          <th className="px-3 py-2 font-semibold">Lead investor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.rows.slice(0, 5).map((raw, i) => {
                          const d = normalizeDealInput(raw);
                          return (
                            <tr key={f.rowNumbers[i]} className="border-0 border-t border-solid border-slate-100 text-slate-700">
                              <td className="px-3 py-2 text-slate-400">{f.rowNumbers[i]}</td>
                              <td className="whitespace-nowrap px-3 py-2">{d.date ? formatDealDate(d.date) : <span className="text-red-600">invalid</span>}</td>
                              <td className="px-3 py-2 font-semibold">{d.startupName || <span className="text-red-600">missing</span>}</td>
                              <td className="px-3 py-2">{d.sector || '—'}</td>
                              <td className="px-3 py-2">{d.roundStage ? <span className={stagePill}>{d.roundStage}</span> : '—'}</td>
                              <td className="whitespace-nowrap px-3 py-2 font-mono">{formatUsdMn(parseAmountToUsdMn(d.amountRaw))}</td>
                              <td className="px-3 py-2">{[d.city, d.country].filter(Boolean).join(', ') || '—'}</td>
                              <td className="px-3 py-2">{d.leadInvestor || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {f.rows.length > 5 && <p className="m-0 mt-2 text-xs text-slate-500">Showing the first 5 of {f.rows.length.toLocaleString()} rows.</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btnPrimary} onClick={importAll} disabled={importing}>
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import {pending.reduce((a, f) => a + validCount(f), 0).toLocaleString()} deals from {pending.length} {pending.length === 1 ? 'file' : 'files'}
          </button>
          <span className="text-xs text-slate-500">Each file becomes one entry in Upload History.</span>
        </div>
      )}
    </div>
  );
}
