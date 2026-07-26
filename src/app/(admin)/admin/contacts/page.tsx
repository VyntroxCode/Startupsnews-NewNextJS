'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

/* ============================================================
   TYPES
   ============================================================ */
interface Contact {
  id: number;
  name: string;
  company: string;
  types: string[];
  cities: string[];
  country: string;
  emails: string[];
  phones: string[];
  linkedin: string;
  instagram: string;
  sector: string;
  stage: string;
  tags: string[];
  notes: string;
}

interface ContactsConfig {
  types: string[];
  cities: string[];
  countries: string[];
  tags: string[];
}

interface ContactDraft {
  name: string;
  company: string;
  types: string[];
  cities: string[];
  country: string;
  emails: string[];
  phones: string[];
  linkedin: string;
  instagram: string;
  sector: string;
  stage: string;
  tags: string[];
  notes: string;
}

const EMPTY_CONFIG: ContactsConfig = { types: [], cities: [], countries: [], tags: [] };
const INVESTOR_TYPES = ['Investor', 'VC Fund', 'Angel Investor', 'Angel Fund'];
const isInvestorType = (t: string) => INVESTOR_TYPES.includes(t);
const contactIsInvestor = (c: Contact) => c.types.some(isInvestorType);

const emptyDraft = (): ContactDraft => ({
  name: '', company: '', types: [], cities: [], country: '', emails: [], phones: [],
  linkedin: '', instagram: '', sector: '', stage: '', tags: [], notes: '',
});

/* ============================================================
   EXCEL COLUMN MATCHING (ported from the standalone prototype)
   ============================================================ */
const FIELD_ALIASES: Record<string, string[]> = {
  name: ['name', 'fullname', 'contactname', 'contact', 'foundername', 'founder', 'person', 'personname', 'contactperson', 'poc'],
  company: ['company', 'companyname', 'startup', 'startupname', 'organisation', 'organization', 'org', 'firm', 'brand', 'companystartup'],
  types: ['types', 'type', 'category', 'categories', 'segment', 'role', 'contacttype'],
  cities: ['cities', 'city', 'location', 'citytown', 'town', 'citypresence', 'basedin', 'baselocation', 'currentcity', 'homecity', 'hqcity', 'cityname', 'locations'],
  country: ['country', 'nation', 'countryregion', 'region'],
  emails: ['emails', 'email', 'emailid', 'emailaddress', 'mail', 'mailid', 'emailids'],
  phones: ['phones', 'phone', 'mobile', 'mobileno', 'contactno', 'number', 'phoneno', 'whatsapp', 'contactnumber', 'mobilenumber', 'phonewhatsapp'],
  linkedin: ['linkedin', 'linkedinurl', 'linkedinprofile', 'li'],
  instagram: ['instagram', 'insta', 'instahandle', 'instagramhandle', 'ig'],
  sector: ['sector', 'industry', 'vertical', 'domain', 'sectorindustry'],
  stage: ['stage', 'level', 'round', 'fundingstage', 'stagelevel'],
  tags: ['tags', 'tag', 'labels', 'label', 'keywords'],
  notes: ['notes', 'note', 'remarks', 'remark', 'comments', 'comment', 'description', 'details'],
};
const MULTI_FIELDS = new Set(['types', 'cities', 'emails', 'phones', 'tags']);
const FIELD_LABELS: Record<string, string> = {
  name: 'Name *', company: 'Company', types: 'Types', cities: 'Cities', country: 'Country',
  emails: 'Emails', phones: 'Phones', linkedin: 'LinkedIn', instagram: 'Instagram',
  sector: 'Sector', stage: 'Stage', tags: 'Tags', notes: 'Notes',
};

function normKey(s: unknown): string {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function splitMulti(v: unknown): string[] {
  return String(v == null ? '' : v).split(/[;,/|\n]/).map((s) => s.trim()).filter(Boolean);
}
function buildHeaderMap(headers: string[]): Record<string, string> {
  const normToOrig: Record<string, string> = {};
  headers.forEach((h) => { normToOrig[normKey(h)] = h; });
  const used = new Set<string>();
  const map: Record<string, string> = {};
  for (const field in FIELD_ALIASES) {
    for (const alias of FIELD_ALIASES[field]) {
      const orig = normToOrig[alias];
      if (orig !== undefined && !used.has(orig)) { map[field] = orig; used.add(orig); break; }
    }
  }
  for (const field in FIELD_ALIASES) {
    if (map[field]) continue;
    const hit = headers.find((h) => {
      if (used.has(h)) return false;
      const nh = normKey(h);
      return FIELD_ALIASES[field].some((a) => a.length >= 4 && (nh.includes(a) || a.includes(nh)) && nh.length >= 4);
    });
    if (hit) { map[field] = hit; used.add(hit); }
  }
  return map;
}
function rowToDraft(row: Record<string, unknown>, map: Record<string, string>): ContactDraft | null {
  const get = (f: string) => (map[f] !== undefined ? row[map[f]] : '');
  let name = String(get('name') || '').trim();
  const company = String(get('company') || '').trim();
  const emailRaw = String(get('emails') || '').trim();
  const phoneRaw = String(get('phones') || '').trim();
  if (!name) name = company || (emailRaw ? emailRaw.split(/[;,]/)[0].trim() : '') || (phoneRaw ? phoneRaw.split(/[;,]/)[0].trim() : '');
  if (!name) return null;
  const draft = emptyDraft();
  draft.name = name;
  for (const f of Object.keys(FIELD_ALIASES)) {
    if (f === 'name') continue;
    const raw = get(f);
    if (MULTI_FIELDS.has(f)) (draft as unknown as Record<string, string[]>)[f] = splitMulti(raw);
    else (draft as unknown as Record<string, string>)[f] = String(raw == null ? '' : raw).trim();
  }
  return draft;
}
interface SheetRows { name: string; headers: string[]; rows: Record<string, unknown>[]; }
function readSheetRows(ws: XLSX.WorkSheet): { rows: Record<string, unknown>[]; headers: string[] } {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return { rows: [], headers: [] };
  let headerIdx = 0, bestScore = -1;
  const scan = Math.min(aoa.length, 8);
  for (let i = 0; i < scan; i++) {
    const cells = aoa[i].map(normKey).filter(Boolean);
    if (!cells.length) continue;
    let score = 0;
    for (const field in FIELD_ALIASES) {
      if (cells.some((c) => FIELD_ALIASES[field].includes(c) || FIELD_ALIASES[field].some((a) => c.includes(a)))) score++;
    }
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  const headers = aoa[headerIdx].map((h) => String(h).trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, ci) => { if (h !== '') obj[h] = (aoa[i] as unknown[])[ci]; });
    if (Object.values(obj).some((v) => String(v).trim() !== '')) rows.push(obj);
  }
  return { rows, headers };
}

const EXPORT_COLUMNS = ['Name', 'Company', 'Types', 'Cities', 'Country', 'Emails', 'Phones', 'LinkedIn', 'Instagram', 'Sector', 'Stage', 'Tags', 'Notes'];
const EXPORT_COL_W = [{ wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 40 }];
function contactToExportRow(c: Contact) {
  return {
    Name: c.name, Company: c.company, Types: c.types.join('; '), Cities: c.cities.join('; '),
    Country: c.country, Emails: c.emails.join('; '), Phones: c.phones.join('; '), LinkedIn: c.linkedin,
    Instagram: c.instagram, Sector: c.sector, Stage: c.stage, Tags: c.tags.join('; '), Notes: c.notes,
  };
}
function downloadContactsExcel(list: Contact[], filename: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(list.map(contactToExportRow), { header: EXPORT_COLUMNS });
  ws['!cols'] = EXPORT_COL_W;
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
  XLSX.writeFile(wb, filename);
}

/* ============================================================
   SMALL PRESENTATIONAL HELPERS
   ============================================================ */
function typeBadgeClass(t: string): string {
  const map: Record<string, string> = { Startup: 'b-startup', Sponsor: 'b-sponsor', 'Venue partner': 'b-venue', Media: 'b-media' };
  return isInvestorType(t) ? 'b-investor' : map[t] || 'b-default';
}
function waLink(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, { ...init, headers: { ...getAuthHeaders(), ...(init?.headers || {}) } });
  return res.json();
}

/* ============================================================
   PAGE
   ============================================================ */
export default function ContactsPage() {
  const [tab, setTab] = useState<'contacts' | 'admin'>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [config, setConfig] = useState<ContactsConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'company' | 'city' | 'country'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(500);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [viewingContactId, setViewingContactId] = useState<number | null>(null);

  const [bulkCity, setBulkCity] = useState('');
  const [bulkCountry, setBulkCountry] = useState('');
  const [bulkTag, setBulkTag] = useState('');

  const [newType, setNewType] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('');

  const [importReport, setImportReport] = useState<{ imported: number; updated: number; dropped: number; mapping: Record<string, string> | null; skippedSheets: { name: string; rows: number }[] } | null>(null);
  const [pendingImport, setPendingImport] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [lastImportSheets, setLastImportSheets] = useState<SheetRows[]>([]);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapSelections, setMapSelections] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [importProgress, setImportProgress] = useState<{ label: string; current: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, kind: 'success' | 'error' = 'success') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  }

  async function loadContacts() {
    const res = await api<Contact[]>('/api/admin/contacts?limit=50000');
    if (res.success && res.data) setContacts(res.data);
    else showToast(res.error || 'Failed to load contacts', 'error');
  }
  async function loadConfig() {
    const res = await api<ContactsConfig>('/api/admin/contacts/config');
    if (res.success && res.data) setConfig(res.data);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadContacts(), loadConfig()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewingContact = useMemo(() => contacts.find((c) => c.id === viewingContactId) ?? null, [contacts, viewingContactId]);

  const cityOptions = useMemo(() => [...new Set([...config.cities, ...contacts.flatMap((c) => c.cities)].filter(Boolean))].sort(), [config.cities, contacts]);
  const countryOptions = useMemo(() => [...new Set([...config.countries, ...contacts.map((c) => c.country)].filter(Boolean))].sort(), [config.countries, contacts]);
  const tagOptions = useMemo(() => [...new Set([...config.tags, ...contacts.flatMap((c) => c.tags)].filter(Boolean))].sort(), [config.tags, contacts]);
  const typeOptions = useMemo(() => [...new Set([...config.types, ...contacts.flatMap((c) => c.types)].filter(Boolean))].sort(), [config.types, contacts]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.company} ${c.cities.join(' ')} ${c.country} ${c.sector} ${c.tags.join(' ')} ${c.emails.join(' ')} ${c.phones.join(' ')} ${c.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cityFilter && !c.cities.includes(cityFilter)) return false;
      if (typeFilter) {
        if (typeFilter === 'Investor') { if (!contactIsInvestor(c)) return false; }
        else if (!c.types.includes(typeFilter)) return false;
      }
      if (countryFilter && c.country !== countryFilter) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [contacts, deferredSearch, cityFilter, typeFilter, countryFilter, tagFilter]);

  const sorted = useMemo(() => {
    const getVal = (c: Contact) => {
      if (sortKey === 'name') return c.name;
      if (sortKey === 'company') return c.company;
      if (sortKey === 'city') return c.cities[0] || '';
      return c.country;
    };
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => getVal(a).localeCompare(getVal(b), undefined, { sensitivity: 'base' }) * dir);
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: 'name' | 'company' | 'city' | 'country') {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageStart = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = pageSize === 'all' ? sorted.length : Math.min(pageStart + pageSize, sorted.length);
  const pageSlice = sorted.slice(pageStart, pageEnd);

  function clearFilters() {
    setSearch(''); setCityFilter(''); setCountryFilter(''); setTypeFilter(''); setTagFilter('');
    setPage(1); setSelectedIds(new Set());
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function toggleSelectAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageSlice.forEach((c) => { if (checked) next.add(c.id); else next.delete(c.id); });
      return next;
    });
  }

  /* ---- CRUD ---- */
  function openAddModal() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }
  function openEditModal(c: Contact) {
    setEditingId(c.id);
    setDraft({
      name: c.name, company: c.company, types: [...c.types], cities: [...c.cities], country: c.country,
      emails: [...c.emails], phones: [...c.phones], linkedin: c.linkedin, instagram: c.instagram,
      sector: c.sector, stage: c.stage, tags: [...c.tags], notes: c.notes,
    });
    setViewingContactId(null);
    setModalOpen(true);
  }

  async function saveContact() {
    if (!draft.name.trim()) { showToast('Name is required', 'error'); return; }
    if (!draft.types.length) { showToast('Select at least one type', 'error'); return; }
    setSaving(true);
    const body = {
      ...draft,
      cities: draft.cities.filter(Boolean),
      emails: draft.emails.filter(Boolean),
      phones: draft.phones.filter(Boolean),
    };
    const res = editingId
      ? await api(`/api/admin/contacts/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      : await api('/api/admin/contacts', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (!res.success) { showToast(res.error || 'Failed to save contact', 'error'); return; }
    setModalOpen(false);
    showToast(editingId ? 'Contact updated' : 'Contact added');
    await loadContacts();
  }

  async function deleteContact(id: number) {
    if (!confirm('Delete this contact?')) return;
    const res = await api(`/api/admin/contacts/${id}`, { method: 'DELETE' });
    if (!res.success) { showToast(res.error || 'Failed to delete', 'error'); return; }
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setViewingContactId((vid) => (vid === id ? null : vid));
    showToast('Deleted');
    await loadContacts();
  }

  /* ---- BULK ---- */
  async function runBulk(action: 'setCity' | 'setCountry' | 'addTag' | 'delete', value?: string) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBusy(true);
    const res = await api('/api/admin/contacts/bulk', { method: 'POST', body: JSON.stringify({ ids, action, value }) });
    setBusy(false);
    if (!res.success) { showToast(res.error || 'Bulk action failed', 'error'); return; }
    showToast(`Applied to ${ids.length.toLocaleString()} contact(s)`);
    if (action === 'delete') setSelectedIds(new Set());
    await loadContacts();
  }

  /* ---- CONFIG ---- */
  async function saveConfig(next: ContactsConfig) {
    setConfig(next);
    await api('/api/admin/contacts/config', { method: 'PUT', body: JSON.stringify(next) });
  }
  function addOption(kind: keyof ContactsConfig, value: string, clear: () => void) {
    const val = value.trim();
    if (!val) return;
    if (config[kind].some((x) => x.toLowerCase() === val.toLowerCase())) { showToast('Already exists', 'error'); return; }
    saveConfig({ ...config, [kind]: [...config[kind], val] });
    clear();
    showToast('Added');
  }
  function removeOption(kind: keyof ContactsConfig, idx: number) {
    const next = [...config[kind]];
    next.splice(idx, 1);
    saveConfig({ ...config, [kind]: next });
    showToast('Removed', 'error');
  }

  async function deleteAllContacts() {
    if (!contacts.length) return;
    if (!confirm(`This permanently deletes all ${contacts.length.toLocaleString()} contacts from the database. This cannot be undone. Continue?`)) return;
    setBusy(true);
    const res = await api('/api/admin/contacts/bulk', { method: 'POST', body: JSON.stringify({ ids: contacts.map((c) => c.id), action: 'delete' }) });
    setBusy(false);
    if (!res.success) { showToast(res.error || 'Failed to delete contacts', 'error'); return; }
    setSelectedIds(new Set());
    showToast('All contacts deleted', 'error');
    await loadContacts();
  }

  /* ---- EXCEL IMPORT ---- */
  const IMPORT_BATCH_SIZE = 300;

  async function uploadDraftsInBatches(drafts: ContactDraft[]): Promise<{ imported: number; updated: number; dropped: number } | null> {
    const totalRows = drafts.length;
    let imported = 0;
    let updated = 0;
    let dropped = 0;
    for (let offset = 0; offset < totalRows; offset += IMPORT_BATCH_SIZE) {
      const batch = drafts.slice(offset, offset + IMPORT_BATCH_SIZE);
      setImportProgress({ label: `Uploading contacts — ${offset.toLocaleString()} of ${totalRows.toLocaleString()}…`, current: offset, total: totalRows });
      const importRes = await api<{ imported: number; updated: number; dropped: number }>('/api/admin/contacts/import', {
        method: 'POST',
        body: JSON.stringify({ rows: batch }),
      });
      if (!importRes.success || !importRes.data) {
        showToast(importRes.error || 'Import failed partway through', 'error');
        return null;
      }
      imported += importRes.data.imported;
      updated += importRes.data.updated;
      dropped += importRes.data.dropped;
    }
    setImportProgress({ label: `Uploaded ${totalRows.toLocaleString()} of ${totalRows.toLocaleString()}`, current: totalRows, total: totalRows });
    return { imported, updated, dropped };
  }

  async function handleFileSelected(file: File) {
    setBusy(true);
    setImportProgress({ label: `Reading ${file.name}…`, current: 0, total: 1 });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheets: SheetRows[] = [];
      for (const name of wb.SheetNames) {
        const { rows, headers } = readSheetRows(wb.Sheets[name]);
        if (rows.length) sheets.push({ name, headers, rows });
      }
      setLastImportSheets(sheets);

      const allDrafts: ContactDraft[] = [];
      let usedMapping: Record<string, string> | null = null;
      const skippedSheets: { name: string; rows: number }[] = [];
      let firstUnmapped: SheetRows | null = null;

      for (const sheet of sheets) {
        const map = buildHeaderMap(sheet.headers);
        if (!map.name && !map.company && !map.emails && !map.phones) {
          skippedSheets.push({ name: sheet.name, rows: sheet.rows.length });
          if (!firstUnmapped) firstUnmapped = sheet;
          continue;
        }
        usedMapping = map;
        sheet.rows.forEach((r) => { const d = rowToDraft(r, map); if (d) allDrafts.push(d); });
      }

      if (!allDrafts.length) {
        setBusy(false);
        setImportProgress(null);
        if (firstUnmapped) {
          setPendingImport({ headers: firstUnmapped.headers, rows: firstUnmapped.rows });
          setMapSelections(buildHeaderMap(firstUnmapped.headers));
          setMapModalOpen(true);
        } else {
          showToast('No readable rows found in the file', 'error');
        }
        return;
      }

      const result = await uploadDraftsInBatches(allDrafts);
      setBusy(false);
      setImportProgress(null);
      if (!result) return;

      setImportReport({ imported: result.imported, updated: result.updated, dropped: result.dropped, mapping: usedMapping, skippedSheets });
      showToast(`Imported ${result.imported.toLocaleString()} contacts${result.updated ? `, updated ${result.updated.toLocaleString()} duplicates` : ''}`);
      await loadContacts();
    } catch (err) {
      setBusy(false);
      setImportProgress(null);
      showToast('Could not read file — is it a valid Excel/CSV?', 'error');
      console.error(err);
    }
  }

  function openRemap() {
    if (!lastImportSheets.length) { showToast('Upload an Excel file first', 'error'); return; }
    const main = lastImportSheets.reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
    const allRows = lastImportSheets.flatMap((sh) => sh.rows);
    setPendingImport({ headers: main.headers, rows: allRows });
    setMapSelections(buildHeaderMap(main.headers));
    setMapModalOpen(true);
  }

  async function applyMapping() {
    if (!pendingImport) return;
    if (!mapSelections.name) { showToast('Please choose which column is the Name', 'error'); return; }
    const drafts = pendingImport.rows.map((r) => rowToDraft(r, mapSelections)).filter((d): d is ContactDraft => !!d);
    if (!drafts.length) { showToast('Still no rows with a name value', 'error'); return; }
    setBusy(true);
    setMapModalOpen(false);
    const result = await uploadDraftsInBatches(drafts);
    setBusy(false);
    setImportProgress(null);
    setPendingImport(null);
    if (!result) return;
    setImportReport({ imported: result.imported, updated: result.updated, dropped: result.dropped, mapping: mapSelections, skippedSheets: [] });
    showToast(`Imported ${result.imported.toLocaleString()} contacts${result.updated ? `, updated ${result.updated.toLocaleString()} duplicates` : ''}`);
    await loadContacts();
  }

  /* ---- RENDER ---- */
  return (
    <AdminErrorBoundary>
      <div className="cm-wrap">
        <div className="cm-header">
          <div>
            <h2 className="cm-title">Network Manager</h2>
            <p className="cm-subtitle">Contacts database — founders, investors, sponsors, venues, media</p>
          </div>
          <div className="cm-header-actions">
            <button className="btn" disabled={busy} onClick={() => fileInputRef.current?.click()} title="Upload an Excel workbook">
              {busy ? (<span className="cm-btn-loading"><svg className="cm-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path></svg>Uploading…</span>) : 'Upload Excel'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }}
            />
            <button className="btn" disabled={busy} onClick={openRemap} title="Re-assign which Excel column feeds each field">Fix columns</button>
            <button className="btn btn-green" onClick={() => downloadContactsExcel(filtered, `SNF_contacts_${new Date().toISOString().slice(0, 10)}.xlsx`)}>Export Excel</button>
            <button className="btn btn-accent" onClick={openAddModal}>+ Add contact</button>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'contacts' ? 'active' : ''}`} onClick={() => setTab('contacts')}>Contacts</button>
          <button className={`tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>Admin &amp; Config</button>
        </div>

        {loading ? (
          <div className="cm-loading">Loading contacts…</div>
        ) : tab === 'contacts' ? (
          <>
            <div className="stats">
              <div className="stat accent"><div className="n">{filtered.length}</div><div className="l">Total</div></div>
              <div className="stat"><div className="n">{new Set(filtered.flatMap((c) => c.cities).filter(Boolean)).size}</div><div className="l">Cities</div></div>
              <div className="stat green"><div className="n">{filtered.filter(contactIsInvestor).length}</div><div className="l">Investors</div></div>
              <div className="stat amber"><div className="n">{filtered.filter((c) => c.types.includes('Sponsor')).length}</div><div className="l">Sponsors</div></div>
              <div className="stat blue"><div className="n">{filtered.filter((c) => c.types.includes('Startup')).length}</div><div className="l">Startups</div></div>
              <div className="stat purple"><div className="n">{new Set(filtered.map((c) => c.company).filter(Boolean)).size}</div><div className="l">Companies</div></div>
            </div>

            <div className="toolbar">
              <div className="search-wrap">
                <input type="text" placeholder="Search name, company, city, email, phone, tags…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}>
                <option value="">All cities</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}>
                <option value="">All countries</option>
                {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All types</option>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}>
                <option value="">All tags</option>
                {tagOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn btn-ghost" onClick={clearFilters}>Clear</button>
            </div>

            <div className="count-label">
              {filtered.length
                ? <>Showing <b>{(pageStart + 1).toLocaleString()}–{pageEnd.toLocaleString()}</b> of <b>{filtered.length.toLocaleString()}</b> matching contacts (total {contacts.length.toLocaleString()})</>
                : <>Showing 0 of {contacts.length.toLocaleString()} contacts</>}
            </div>

            {selectedIds.size > 0 && (
              <div className="bulk-bar show">
                <span className="bulk-count">{selectedIds.size.toLocaleString()} selected</span>
                <div className="bulk-group">
                  <input list="cityList" placeholder="Set city…" value={bulkCity} onChange={(e) => setBulkCity(e.target.value)} />
                  <button className="btn btn-sm" disabled={busy} onClick={() => { if (!bulkCity.trim()) { showToast('Enter a city first', 'error'); return; } runBulk('setCity', bulkCity.trim()); setBulkCity(''); }}>Set City</button>
                </div>
                <div className="bulk-group">
                  <select value={bulkCountry} onChange={(e) => setBulkCountry(e.target.value)}>
                    <option value="">Select country</option>
                    {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn btn-sm" disabled={busy} onClick={() => { if (!bulkCountry) { showToast('Select a country first', 'error'); return; } runBulk('setCountry', bulkCountry); }}>Set Country</button>
                </div>
                <div className="bulk-group">
                  <input placeholder="Add tag…" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} />
                  <button className="btn btn-sm" disabled={busy} onClick={() => { if (!bulkTag.trim()) { showToast('Enter a tag first', 'error'); return; } runBulk('addTag', bulkTag.trim()); setBulkTag(''); }}>Add Tag</button>
                </div>
                <button className="btn btn-sm btn-accent" onClick={() => downloadContactsExcel(contacts.filter((c) => selectedIds.has(c.id)), `SNF_selected_${new Date().toISOString().slice(0, 10)}.xlsx`)}>Download selected</button>
                <span className="bulk-link" onClick={() => { if (confirm(`Delete ${selectedIds.size} selected contact(s)?`)) runBulk('delete'); }}>Delete selected</span>
                <span className="bulk-link" onClick={() => setSelectedIds(new Set(filtered.map((c) => c.id)))}>Select all {filtered.length.toLocaleString()} filtered</span>
                <span className="bulk-link" onClick={() => setSelectedIds(new Set())}>Clear selection</span>
              </div>
            )}

            <div className="tbl-wrap">
              <div className="tbl-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="col-chk">
                        <input
                          type="checkbox"
                          checked={pageSlice.length > 0 && pageSlice.every((c) => selectedIds.has(c.id))}
                          onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                        />
                      </th>
                      <th className="col-name sortable" onClick={() => toggleSort('name')}>Name{sortKey === 'name' && <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}</th>
                      <th className="col-co sortable" onClick={() => toggleSort('company')}>Company{sortKey === 'company' && <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}</th>
                      <th className="col-type">Type</th>
                      <th className="col-city sortable" onClick={() => toggleSort('city')}>City{sortKey === 'city' && <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}</th>
                      <th className="col-country sortable" onClick={() => toggleSort('country')}>Country{sortKey === 'country' && <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}</th>
                      <th className="col-tags">Tags</th>
                      <th className="col-email">Email</th>
                      <th className="col-phone">Phone</th>
                      <th className="col-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.map((c) => {
                      const sel = selectedIds.has(c.id);
                      const wa = c.phones[0] ? waLink(c.phones[0]) : null;
                      return (
                        <tr key={c.id} className={sel ? 'row-selected' : ''}>
                          <td className="col-chk"><input type="checkbox" checked={sel} onChange={(e) => toggleRow(c.id, e.target.checked)} /></td>
                          <td className="col-name"><span className="name-cell name-link" onClick={() => setViewingContactId(c.id)}>{c.name}</span></td>
                          <td className="col-co" title={c.company}>{c.company || <span className="muted">—</span>}</td>
                          <td className="col-type">{c.types.length ? c.types.map((t) => <span key={t} className={`badge ${typeBadgeClass(t)}`}>{t}</span>) : <span className="muted">—</span>}</td>
                          <td className="col-city" title={c.cities.join(', ')}>{c.cities.length ? <>{c.cities[0]}{c.cities.length > 1 && <span className="multi-mini">+{c.cities.length - 1}</span>}</> : <span className="muted">—</span>}</td>
                          <td className="col-country" title={c.country}>{c.country || <span className="muted">—</span>}</td>
                          <td className="col-tags" title={c.tags.join(', ')}>{c.tags.length ? c.tags.map((t) => <span key={t} className="tag-chip">{t}</span>) : <span className="muted">—</span>}</td>
                          <td className="col-email" title={c.emails.join(', ')}>{c.emails.length ? <>{c.emails[0]}{c.emails.length > 1 && <span className="multi-mini">+{c.emails.length - 1}</span>}</> : <span className="muted">—</span>}</td>
                          <td className="col-phone" title={c.phones.join(', ')}>
                            {c.phones.length ? (
                              <span className="phone-wrap">
                                <span className="phone-num">{c.phones[0]}</span>
                                {wa && <a className="wa-icon" href={wa} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${c.phones[0]}`}>W</a>}
                                {c.phones.length > 1 && <span className="multi-mini">+{c.phones.length - 1}</span>}
                              </span>
                            ) : <span className="muted">—</span>}
                          </td>
                          <td className="col-act">
                            <div className="row-actions">
                              <button onClick={() => openEditModal(c)} title="Edit">Edit</button>
                              <button className="del" onClick={() => deleteContact(c.id)} title="Delete">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div className="empty">
                  <p>No contacts match your filters.</p>
                  <button className="btn" onClick={clearFilters}>Clear filters</button>
                </div>
              )}

              <div className="pagination">
                <span className="page-info">{pageSize === 'all' ? `All ${filtered.length.toLocaleString()} rows shown` : `Page ${currentPage} of ${totalPages}`}</span>
                <select value={pageSize} onChange={(e) => { setPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10)); setPage(1); }}>
                  <option value={100}>100 / page</option>
                  <option value={250}>250 / page</option>
                  <option value={500}>500 / page</option>
                  <option value={1000}>1000 / page</option>
                  <option value="all">Show all</option>
                </select>
                <button disabled={pageSize === 'all' || currentPage <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
                <button disabled={pageSize === 'all' || currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
              </div>
            </div>

            <datalist id="cityList">{cityOptions.map((c) => <option key={c} value={c} />)}</datalist>
          </>
        ) : (
          <AdminConfigTab
            config={config}
            newType={newType} setNewType={setNewType}
            newTag={newTag} setNewTag={setNewTag}
            newCity={newCity} setNewCity={setNewCity}
            newCountry={newCountry} setNewCountry={setNewCountry}
            onAdd={addOption}
            onRemove={removeOption}
            contactCount={contacts.length}
            onDeleteAll={deleteAllContacts}
            busy={busy}
          />
        )}

        {modalOpen && (
          <ContactModal
            draft={draft}
            setDraft={setDraft}
            config={config}
            editing={editingId !== null}
            saving={saving}
            onCancel={() => setModalOpen(false)}
            onSave={saveContact}
          />
        )}

        {viewingContact && (
          <ContactCardModal
            contact={viewingContact}
            onClose={() => setViewingContactId(null)}
            onEdit={() => openEditModal(viewingContact)}
            onDelete={() => deleteContact(viewingContact.id)}
          />
        )}

        {importReport && (
          <ImportReportModal report={importReport} onClose={() => setImportReport(null)} onFix={() => { setImportReport(null); openRemap(); }} />
        )}

        {mapModalOpen && pendingImport && (
          <MappingModal
            headers={pendingImport.headers}
            selections={mapSelections}
            setSelections={setMapSelections}
            onCancel={() => { setMapModalOpen(false); setPendingImport(null); }}
            onApply={applyMapping}
            busy={busy}
          />
        )}

        {importProgress && (
          <div className="overlay open">
            <div className="cm-progress-modal">
              <div className="cm-progress-title">Uploading Excel…</div>
              <div className="cm-progress-label">{importProgress.label}</div>
              <div className="cm-progress-track">
                <div
                  className="cm-progress-fill"
                  style={{ width: `${importProgress.total ? Math.min(100, (importProgress.current / importProgress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="cm-progress-pct">
                {importProgress.total ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100)) : 0}%
              </div>
            </div>
          </div>
        )}

        {toast && <div className={`toast show ${toast.kind}`}>{toast.msg}</div>}
      </div>

      <ContactsStyles />
    </AdminErrorBoundary>
  );
}

/* ============================================================
   ADD/EDIT MODAL
   ============================================================ */
function MultiRows({ label, values, onChange, placeholder, type = 'text', cityList }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; type?: string; cityList?: boolean;
}) {
  const rows = values.length ? values : [''];
  return (
    <div className="fg full">
      <label>{label}</label>
      {rows.map((v, i) => (
        <div className="multi-row" key={i}>
          <input
            type={type}
            list={cityList ? 'cityList' : undefined}
            placeholder={placeholder}
            value={v}
            onChange={(e) => { const next = [...rows]; next[i] = e.target.value; onChange(next); }}
          />
          <button type="button" className="rm" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>×</button>
        </div>
      ))}
      <span className="add-line" onClick={() => onChange([...rows, ''])}>+ add {label.split(' ')[0].toLowerCase()}</span>
    </div>
  );
}

function ContactModal({ draft, setDraft, config, editing, saving, onCancel, onSave }: {
  draft: ContactDraft; setDraft: (d: ContactDraft) => void; config: ContactsConfig; editing: boolean; saving: boolean;
  onCancel: () => void; onSave: () => void;
}) {
  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editing ? 'Edit contact' : 'Add contact'}</h2>
          <button className="btn btn-ghost icon-btn" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="fg"><label>Full name *</label><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ravi Sharma" /></div>
            <div className="fg"><label>Company / Startup</label><input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="Acme Inc." /></div>

            <div className="fg full">
              <label>Types * (one or more)</label>
              <div className="tag-picker">
                {config.types.map((t) => (
                  <span key={t} className={`tag-opt ${draft.types.includes(t) ? 'sel' : ''}`} onClick={() => setDraft({ ...draft, types: draft.types.includes(t) ? draft.types.filter((x) => x !== t) : [...draft.types, t] })}>{t}</span>
                ))}
              </div>
            </div>

            <div className="fg"><label>Sector / Industry</label><input value={draft.sector} onChange={(e) => setDraft({ ...draft, sector: e.target.value })} placeholder="Fintech, D2C, SaaS…" /></div>

            <MultiRows label="Cities (one or more)" values={draft.cities} onChange={(v) => setDraft({ ...draft, cities: v })} placeholder="City" cityList />

            <div className="fg">
              <label>Country</label>
              <select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })}>
                <option value="">Select country</option>
                {config.countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg"><label>Stage / Level</label><input value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })} placeholder="Seed, Series A, Angel…" /></div>

            <MultiRows label="Emails (one or more)" values={draft.emails} onChange={(v) => setDraft({ ...draft, emails: v })} placeholder="name@company.com" type="email" />
            <MultiRows label="Phones / WhatsApp (one or more)" values={draft.phones} onChange={(v) => setDraft({ ...draft, phones: v })} placeholder="+91 98765 43210" />

            <div className="fg"><label>LinkedIn URL</label><input value={draft.linkedin} onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })} placeholder="linkedin.com/in/ravi" /></div>
            <div className="fg"><label>Instagram handle</label><input value={draft.instagram} onChange={(e) => setDraft({ ...draft, instagram: e.target.value })} placeholder="@ravisharma" /></div>

            <div className="fg full">
              <label>Tags</label>
              <div className="tag-picker">
                {config.tags.map((t) => (
                  <span key={t} className={`tag-opt ${draft.tags.includes(t) ? 'sel' : ''}`} onClick={() => setDraft({ ...draft, tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })}>{t}</span>
                ))}
              </div>
            </div>

            <div className="fg full"><label>Notes</label><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Met at SNF Dubai event. Keen on sponsoring Q3." /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : editing ? 'Update contact' : 'Save contact'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTACT CARD (VIEW) MODAL
   ============================================================ */
function CardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="card-row">
      <div className="card-row-label">{label}</div>
      <div className="card-row-value">{children}</div>
    </div>
  );
}

function ContactCardModal({ contact, onClose, onEdit, onDelete }: {
  contact: Contact; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const wa = contact.phones[0] ? waLink(contact.phones[0]) : null;
  const initials = contact.name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal card-modal">
        <div className="card-modal-corner">
          <button className="btn btn-ghost icon-btn" onClick={onEdit} title="Edit">✎</button>
          <button className="btn btn-ghost icon-btn del" onClick={onDelete} title="Delete">✕</button>
          <button className="btn btn-ghost icon-btn" onClick={onClose} title="Close">×</button>
        </div>
        <div className="card-hero">
          <div className="card-avatar">{initials}</div>
          <div>
            <h2 className="card-name">{contact.name}</h2>
            {contact.company && <div className="card-company">{contact.company}</div>}
            <div className="card-badges">
              {contact.types.length
                ? contact.types.map((t) => <span key={t} className={`badge ${typeBadgeClass(t)}`}>{t}</span>)
                : <span className="muted">No type set</span>}
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="card-grid">
            <CardRow label="Cities">{contact.cities.length ? contact.cities.join(', ') : <span className="muted">—</span>}</CardRow>
            <CardRow label="Country">{contact.country || <span className="muted">—</span>}</CardRow>
            <CardRow label="Sector">{contact.sector || <span className="muted">—</span>}</CardRow>
            <CardRow label="Stage">{contact.stage || <span className="muted">—</span>}</CardRow>
            <CardRow label="Emails">
              {contact.emails.length ? contact.emails.map((e) => <a key={e} className="card-link" href={`mailto:${e}`}>{e}</a>) : <span className="muted">—</span>}
            </CardRow>
            <CardRow label="Phones">
              {contact.phones.length ? (
                <>
                  {contact.phones.map((p) => <span key={p} className="card-link">{p}</span>)}
                  {wa && <a className="wa-icon" href={wa} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${contact.phones[0]}`}>W</a>}
                </>
              ) : <span className="muted">—</span>}
            </CardRow>
            <CardRow label="LinkedIn">
              {contact.linkedin ? <a className="card-link" href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer">{contact.linkedin}</a> : <span className="muted">—</span>}
            </CardRow>
            <CardRow label="Instagram">{contact.instagram || <span className="muted">—</span>}</CardRow>
            <CardRow label="Tags">
              {contact.tags.length ? contact.tags.map((t) => <span key={t} className="tag-chip">{t}</span>) : <span className="muted">—</span>}
            </CardRow>
            <div className="card-row card-row-full">
              <div className="card-row-label">Notes</div>
              <div className="card-row-value card-notes">{contact.notes || <span className="muted">—</span>}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   IMPORT REPORT + COLUMN MAPPING MODALS
   ============================================================ */
function ImportReportModal({ report, onClose, onFix }: {
  report: { imported: number; updated: number; dropped: number; mapping: Record<string, string> | null; skippedSheets: { name: string; rows: number }[] };
  onClose: () => void; onFix: () => void;
}) {
  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-header"><h2>Import report</h2><button className="btn btn-ghost icon-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <p>
            <b>{report.imported.toLocaleString()}</b> new contacts imported
            {report.updated ? <>, <b>{report.updated.toLocaleString()}</b> existing duplicates updated (matched by email/phone)</> : ''}
            {report.dropped ? <>, <b>{report.dropped.toLocaleString()}</b> rows dropped (missing name)</> : ''}.
          </p>
          {report.skippedSheets.length > 0 && (
            <p style={{ color: '#b3261e', marginTop: 10 }}>
              <b>Skipped sheets (headers not recognized):</b> {report.skippedSheets.map((s) => `${s.name} (~${s.rows} rows)`).join(', ')}. Use &quot;Fix columns&quot; to map them manually.
            </p>
          )}
          {report.mapping && (
            <>
              <p style={{ marginTop: 12 }}><b>Detected column mapping:</b></p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.keys(FIELD_LABELS).map((f) => (
                    <tr key={f}>
                      <td style={{ padding: '2px 8px', color: 'var(--text-muted)' }}>{FIELD_LABELS[f]}</td>
                      <td style={{ padding: '2px 8px', color: report.mapping?.[f] ? undefined : '#b3261e' }}>{report.mapping?.[f] || '— not detected —'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-accent" style={{ marginTop: 10 }} onClick={onFix}>Adjust column mapping</button>
            </>
          )}
        </div>
        <div className="modal-footer"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function MappingModal({ headers, selections, setSelections, onCancel, onApply, busy }: {
  headers: string[]; selections: Record<string, string>; setSelections: (s: Record<string, string>) => void;
  onCancel: () => void; onApply: () => void; busy: boolean;
}) {
  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" style={{ width: 640 }}>
        <div className="modal-header"><h2>Match your Excel columns</h2><button className="btn btn-ghost icon-btn" onClick={onCancel}>×</button></div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>We couldn&apos;t fully auto-detect your columns. Only <b>Name</b> is required.</p>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', marginBottom: 14, wordBreak: 'break-word' }}>
            Found columns: {headers.join(', ')}
          </div>
          <div className="form-grid">
            {Object.keys(FIELD_LABELS).map((f) => (
              <div className="fg" key={f}>
                <label>{FIELD_LABELS[f]}</label>
                <select value={selections[f] || ''} onChange={(e) => setSelections({ ...selections, [f]: e.target.value })}>
                  <option value="">— none —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent" disabled={busy} onClick={onApply}>{busy ? 'Importing…' : 'Import with this mapping'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN & CONFIG TAB
   ============================================================ */
function ChipEditor({ title, desc, items, onAdd, onRemove, value, onChange, placeholder }: {
  title: string; desc: string; items: string[]; onAdd: () => void; onRemove: (idx: number) => void;
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="desc">{desc}</div>
      <div className="chip-list">
        {items.length ? items.map((v, i) => (
          <span className="ed-chip" key={v}>{v}<button onClick={() => onRemove(i)}>×</button></span>
        )) : <span className="muted" style={{ fontSize: 12 }}>None yet.</span>}
      </div>
      <div className="add-inline">
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }} />
        <button className="btn btn-sm btn-accent" onClick={onAdd}>Add</button>
      </div>
    </div>
  );
}

function AdminConfigTab({ config, newType, setNewType, newTag, setNewTag, newCity, setNewCity, newCountry, setNewCountry, onAdd, onRemove, contactCount, onDeleteAll, busy }: {
  config: ContactsConfig;
  newType: string; setNewType: (v: string) => void;
  newTag: string; setNewTag: (v: string) => void;
  newCity: string; setNewCity: (v: string) => void;
  newCountry: string; setNewCountry: (v: string) => void;
  onAdd: (kind: keyof ContactsConfig, value: string, clear: () => void) => void;
  onRemove: (kind: keyof ContactsConfig, idx: number) => void;
  contactCount: number;
  onDeleteAll: () => void;
  busy: boolean;
}) {
  return (
    <div className="admin-grid">
      <ChipEditor title="Contact Types" desc="Add or remove the categories available in the contact form & filters." items={config.types} value={newType} onChange={setNewType} placeholder="New type…" onAdd={() => onAdd('types', newType, () => setNewType(''))} onRemove={(i) => onRemove('types', i)} />
      <ChipEditor title="Tags" desc="Manage the tag library used to label contacts." items={config.tags} value={newTag} onChange={setNewTag} placeholder="New tag…" onAdd={() => onAdd('tags', newTag, () => setNewTag(''))} onRemove={(i) => onRemove('tags', i)} />
      <ChipEditor title="Cities" desc="Predefined cities shown in the form & city filter." items={config.cities} value={newCity} onChange={setNewCity} placeholder="New city…" onAdd={() => onAdd('cities', newCity, () => setNewCity(''))} onRemove={(i) => onRemove('cities', i)} />
      <ChipEditor title="Countries" desc="Predefined countries shown in the form & country filter." items={config.countries} value={newCountry} onChange={setNewCountry} placeholder="New country…" onAdd={() => onAdd('countries', newCountry, () => setNewCountry(''))} onRemove={(i) => onRemove('countries', i)} />

      <div className="panel" style={{ gridColumn: '1/-1' }}>
        <h3>Danger zone</h3>
        <div className="desc">Total contacts stored: <b>{contactCount.toLocaleString()}</b></div>
        <button className="btn btn-sm btn-danger" disabled={busy || !contactCount} onClick={onDeleteAll}>Delete all contacts</button>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES (scoped, ported from the standalone prototype)
   ============================================================ */
function ContactsStyles() {
  return (
    <style jsx global>{`
      .cm-wrap {
        --bg: #F2F6FC; --surface: #ffffff; --surface2: #EAF1FB; --surface3: #DDE9F9;
        --border: rgba(15,35,65,0.09); --border-hover: rgba(15,35,65,0.20);
        --text: #101A2B; --text-muted: #5C6A80; --text-dim: #93A1B5;
        --accent: #2E6BE6; --accent-soft: rgba(46,107,230,0.10); --accent-border: rgba(46,107,230,0.28);
        --green: #0E9C6E; --green-soft: rgba(14,156,110,0.10);
        --blue: #0EA5E9; --blue-soft: rgba(14,165,233,0.10);
        --amber: #D9821B; --amber-soft: rgba(217,130,27,0.12);
        --purple: #6D5EF0; --purple-soft: rgba(109,94,240,0.10);
        --radius: 8px; --radius-lg: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px; color: var(--text);
      }
      .cm-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
      .cm-title { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.3px; }
      .cm-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2rem; }
      .cm-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .cm-loading { padding: 40px; text-align: center; color: var(--text-muted); }
      .cm-btn-loading { display: inline-flex; align-items: center; gap: 6px; }
      .cm-spinner { animation: cm-spin 1s linear infinite; }
      @keyframes cm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
      .tab { padding: 10px 16px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; }
      .tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

      .stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
      .stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; }
      .stat .n { font-size: 26px; font-weight: 700; letter-spacing: -1px; line-height: 1; }
      .stat .l { font-size: 11px; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
      .stat.accent .n { color: var(--accent); } .stat.green .n { color: var(--green); }
      .stat.blue .n { color: var(--blue); } .stat.amber .n { color: var(--amber); } .stat.purple .n { color: var(--purple); }

      .toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
      .search-wrap { flex: 1 1 200px; max-width: 280px; min-width: 160px; }
      .search-wrap input { box-sizing: border-box; width: 100%; height: 36px; padding: 0 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 13px; outline: none; transition: border-color 0.12s ease; }
      .search-wrap input:focus { border-color: var(--accent); }
      .cm-wrap select { box-sizing: border-box; height: 36px; padding: 0 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 12px; outline: none; cursor: pointer; }
      .toolbar select { flex: 0 0 auto; min-width: 110px; }
      .btn { height: 36px; padding: 0 14px; border-radius: var(--radius); font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
      .btn:hover { background: var(--surface2); }
      .btn-accent { background: var(--accent); border-color: var(--accent); color: #fff; }
      .btn-green { background: var(--green); border-color: var(--green); color: #fff; font-weight: 600; }
      .btn-ghost { background: transparent; border-color: transparent; color: var(--text-muted); }
      .btn-sm { height: 30px; padding: 0 10px; font-size: 11px; }
      .btn-danger { color: #b3261e; border-color: rgba(179,38,30,0.3); }
      .btn-danger:hover { background: rgba(179,38,30,0.08); }
      .icon-btn { width: 32px; height: 32px; padding: 0; justify-content: center; }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .count-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }

      .tbl-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      .cm-wrap table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .cm-wrap th { padding: 11px 14px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px; background: var(--surface2); border-bottom: 1px solid var(--border); box-shadow: 0 1px 0 var(--border); text-align: left; white-space: nowrap; position: sticky; top: 0; z-index: 2; }
      .cm-wrap th.sortable { cursor: pointer; user-select: none; }
      .cm-wrap th.sortable:hover { color: var(--text); }
      .sort-arrow { color: var(--accent); }
      .cm-wrap td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; transition: background-color 0.12s ease; }
      .cm-wrap tbody tr:nth-child(even) td { background: rgba(128,128,128,0.035); }
      .cm-wrap tr:hover td { background: var(--surface2); }
      .cm-wrap tbody tr:last-child td { border-bottom: none; }
      .col-chk { width: 38px; } .col-name { width: 160px; } .col-co { width: 130px; } .col-type { width: 130px; }
      .col-city { width: 100px; } .col-country { width: 100px; } .col-tags { width: 160px; }
      .col-email { width: 150px; } .col-phone { width: 150px; overflow: visible; text-overflow: clip; } .col-act { width: 130px; }
      .row-selected td, .cm-wrap tbody tr.row-selected:nth-child(even) td { background: var(--accent-soft) !important; }
      .tbl-scroll { overflow: auto; max-height: 68vh; }
      .tbl-scroll table { min-width: 1100px; }
      .col-chk input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
      .name-cell { font-weight: 600; color: var(--text); } .muted { color: var(--text-dim); }
      .name-link { cursor: pointer; color: var(--accent); }
      .name-link:hover { text-decoration: underline; }
      .multi-mini { font-size: 10px; color: var(--text-dim); margin-left: 4px; }

      .badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 10px; font-weight: 600; white-space: nowrap; margin: 1px 2px 1px 0; }
      .b-default { background: var(--surface3); color: var(--text-muted); border: 1px solid var(--border); }
      .b-startup { background: var(--blue-soft); color: var(--blue); border: 1px solid rgba(37,99,235,0.2); }
      .b-investor { background: var(--green-soft); color: var(--green); border: 1px solid rgba(14,156,110,0.2); }
      .b-sponsor { background: var(--amber-soft); color: var(--amber); border: 1px solid rgba(217,130,27,0.25); }
      .b-venue { background: var(--purple-soft); color: var(--purple); border: 1px solid rgba(124,77,255,0.2); }
      .b-media { background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent-border); }
      .tag-chip { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent-border); margin: 1px 2px 1px 0; }

      .row-actions { display: flex; gap: 6px; }
      .row-actions button { background: var(--surface2); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; padding: 4px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; white-space: nowrap; }
      .row-actions button:hover { background: var(--surface3); color: var(--text); }
      .row-actions button.del { color: #b3261e; border-color: rgba(179,38,30,0.35); background: rgba(179,38,30,0.06); }
      .row-actions button.del:hover { background: rgba(179,38,30,0.14); color: #8f1c15; }

      .wa-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 6px; color: #25D366; background: rgba(37,211,102,0.12); border-radius: 50%; font-size: 10px; font-weight: 700; text-decoration: none; }
      .phone-wrap { display: inline-flex; align-items: center; }
      .phone-num { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 104px; display: inline-block; }

      .empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
      .pagination { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--border); background: var(--surface); flex-wrap: wrap; }
      .pagination .page-info { font-size: 12px; color: var(--text-muted); margin-right: auto; }
      .pagination button { height: 30px; padding: 0 12px; border-radius: var(--radius); font-size: 12px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
      .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

      .bulk-bar { display: none; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--accent-soft); border: 1px solid var(--accent-border); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 12px; }
      .bulk-bar.show { display: flex; }
      .bulk-bar .bulk-count { font-size: 12px; font-weight: 700; color: var(--accent); white-space: nowrap; margin-right: 4px; }
      .bulk-group { display: flex; align-items: center; gap: 4px; }
      .bulk-group input, .bulk-group select { height: 32px; padding: 0 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 12px; }
      .bulk-group input { width: 130px; }
      .bulk-link { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 600; }
      .bulk-link:hover { text-decoration: underline; }

      .overlay { display: none; position: fixed; inset: 0; background: rgba(16,26,43,0.45); z-index: 1000; align-items: center; justify-content: center; }
      .overlay.open { display: flex; }
      .modal { background: var(--surface); border: 1px solid var(--border-hover); border-radius: var(--radius-lg); width: 620px; max-width: 96vw; max-height: 92vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(16,26,43,0.25); color: var(--text); }
      .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--surface); }
      .modal-header h2 { font-size: 15px; font-weight: 600; }
      .modal-body { padding: 20px 24px; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .fg { display: flex; flex-direction: column; gap: 5px; }
      .fg.full { grid-column: 1/-1; }
      .fg label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
      .fg input, .fg select, .fg textarea { min-height: 36px; padding: 0 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 13px; outline: none; font-family: inherit; }
      .fg textarea { min-height: 72px; padding: 10px 12px; resize: vertical; width: 100%; }
      .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

      .multi-row { display: flex; gap: 6px; margin-bottom: 6px; }
      .multi-row input { flex: 1; height: 34px; padding: 0 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; color: var(--text); }
      .multi-row .rm { width: 34px; flex: 0 0 34px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; color: var(--text-muted); font-size: 15px; }
      .add-line { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 600; display: inline-block; margin-top: 2px; }

      .cm-progress-modal { background: var(--surface); border-radius: var(--radius-lg); width: 420px; max-width: 96vw; padding: 24px; box-shadow: 0 24px 48px rgba(16,26,43,0.25); }
      .cm-progress-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
      .cm-progress-label { font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cm-progress-track { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; }
      .cm-progress-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
      .cm-progress-pct { margin-top: 8px; font-size: 12px; color: var(--text-muted); text-align: right; }

      .card-modal { position: relative; width: 560px; }
      .card-modal-corner { position: absolute; top: 14px; right: 14px; display: flex; gap: 4px; z-index: 1; }
      .card-modal-corner .icon-btn { border: 1px solid var(--border); }
      .card-modal-corner .icon-btn.del:hover { color: #b3261e; border-color: rgba(179,38,30,0.3); background: rgba(179,38,30,0.08); }
      .card-hero { display: flex; align-items: center; gap: 16px; padding: 24px 24px 16px; border-bottom: 1px solid var(--border); }
      .card-avatar { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
      .card-name { font-size: 18px; font-weight: 700; }
      .card-company { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .card-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
      .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .card-row-full { grid-column: 1/-1; }
      .card-row-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
      .card-row-value { font-size: 13px; color: var(--text); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      .card-link { color: var(--accent); text-decoration: none; word-break: break-all; }
      .card-link:hover { text-decoration: underline; }
      .card-notes { white-space: pre-wrap; line-height: 1.5; }

      .tag-picker { display: flex; flex-wrap: wrap; gap: 6px; }
      .tag-opt { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; border: 1px solid var(--border); background: var(--surface2); cursor: pointer; color: var(--text-muted); user-select: none; }
      .tag-opt.sel { background: var(--accent); color: #fff; border-color: var(--accent); }

      .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px 20px; }
      .panel h3 { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
      .panel .desc { font-size: 11px; color: var(--text-muted); margin-bottom: 14px; }
      .chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      .ed-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 11px; border-radius: 20px; font-size: 12px; background: var(--surface2); border: 1px solid var(--border); }
      .ed-chip button { background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 13px; padding: 2px 4px; border-radius: 4px; }
      .ed-chip button:hover { background: var(--accent-soft); color: var(--accent); }
      .add-inline { display: flex; gap: 6px; }
      .add-inline input { flex: 1; height: 34px; padding: 0 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; color: var(--text); }

      .toast { position: fixed; bottom: 24px; right: 24px; background: var(--text); color: #fff; padding: 10px 18px; border-radius: var(--radius); font-size: 13px; z-index: 2000; box-shadow: 0 8px 24px rgba(16,26,43,0.25); }
      .toast.success { background: var(--green); } .toast.error { background: #b3261e; }

      @media (max-width: 980px) {
        .stats { grid-template-columns: repeat(3, 1fr); }
        .col-tags, .col-email, .col-phone { display: none; }
        .admin-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
