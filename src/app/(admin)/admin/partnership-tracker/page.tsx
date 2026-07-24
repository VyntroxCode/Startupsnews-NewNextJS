'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import ImageUpload from '@/components/admin/ImageUpload';
import {
  PARTNERSHIP_STATUS_OPTIONS, PARTNERSHIP_TYPE_OPTIONS, LISTING_OPTIONS,
  EVENT_TICKET_TYPE_OPTIONS, CURRENCY_OPTIONS, EVENT_DESCRIPTION_MIN_LENGTH,
  POSTER_SPEC, BANNER_SPEC, SOCIAL_CREATIVE_SPEC, type Speaker,
} from '@/modules/partnership-events/domain/types';
import { STANDARD_HEADERS, partnershipEventToExportRow, dedupKey } from '@/modules/partnership-events/utils/partnership-events.utils';

/* ============================================================
   TYPES
   ============================================================ */
interface PartnershipEvent {
  id: number;
  eventName: string;
  city: string;
  country: string;
  organiser: string;
  poc: string;
  contact: string;
  email: string;
  website: string;
  initiatedDate: string;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  venueAddress: string;
  googleLocationLink: string;
  description: string;
  eventType: string;
  ticketCurrency: string;
  ticketPrice: string;
  speakers: Speaker[];
  posterUrl: string;
  bannerUrl: string;
  socialMediaPosts: string;
  socialCreatives: string[];
  partnershipStatus: string;
  partnershipType: string;
  lastUpdatedDate: string;
  comment: string;
  listing: string;
  listingLink: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

type EventDraft = Omit<PartnershipEvent, 'id' | 'createdAt' | 'updatedAt'>;

const emptySpeaker = (): Speaker => ({ name: '', designation: '', company: '' });

const emptyDraft = (): EventDraft => ({
  eventName: '', city: '', country: '', organiser: '', poc: '', contact: '', email: '', website: '',
  initiatedDate: '', eventStartDate: '', eventStartTime: '', eventEndDate: '', eventEndTime: '',
  venueAddress: '', googleLocationLink: '', description: '', eventType: '', ticketCurrency: '', ticketPrice: '',
  speakers: [], posterUrl: '', bannerUrl: '', socialMediaPosts: '', socialCreatives: [],
  partnershipStatus: '', partnershipType: '',
  lastUpdatedDate: '', comment: '', listing: '', listingLink: '', source: 'Manually added',
});

const STATUS_ORDER = [...PARTNERSHIP_STATUS_OPTIONS] as string[];
const STATUS_COLOR_HEX: Record<string, string> = {
  Initiated: '#7C3FE0', 'In Progress': '#2563C7', Pending: '#B9790A',
  'Partnership Done': '#1E9E64', Dropped: '#C22B44', Unmapped: '#9CA3AF',
};

/* ============================================================
   DERIVED FIELDS (mirrors the original standalone tool)
   ============================================================ */
interface Derived {
  statusBucket: string;
  isExpired: boolean;
  dateOrderSuspect: boolean;
  daysInStatus: number | null;
  listingResolved: string;
  partnershipTypeResolved: string;
}

function startOfToday(): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}
function parseYmd(s: string): number | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d.getTime();
}
function daysBetween(a: number, b: number): number {
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}
function isIndia(country: string): boolean {
  return /india/i.test(country || '');
}
function classifyStatus(raw: string): string {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return 'Unmapped';
  if (STATUS_ORDER.includes(raw)) return raw;
  if (s.includes('done') || s.includes('confirm') || s.includes('complete') || s.includes('executed')) return 'Partnership Done';
  if (s.includes('drop') || s.includes('cancel')) return 'Dropped';
  if (s.includes('progress')) return 'In Progress';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('initiat')) return 'Initiated';
  return 'Unmapped';
}
function normalizeListing(rawListing: string, rawLink: string, statusBucket: string): string {
  const hasLink = !!(rawLink || '').trim();
  const l = (rawListing || '').toLowerCase().trim();
  if (statusBucket === 'Dropped') return 'No';
  if (statusBucket === 'Partnership Done' && hasLink) return 'Yes';
  if (l.includes('process')) return 'In process';
  if (l === 'no' && !hasLink) return 'No';
  return 'Pending';
}

// The Website field should only ever hold the event/organiser's own site — never our own coverage link.
const WEBSITE_EXCLUDE_DOMAINS = ['startupnews.fyi'];
function cleanWebsite(url: string): string {
  const v = (url || '').trim();
  if (!v) return '';
  const low = v.toLowerCase();
  return WEBSITE_EXCLUDE_DOMAINS.some((d) => low.includes(d)) ? '' : v;
}

// A best-effort guess only, used when both City and Country are blank on import.
const KNOWN_CITIES: Record<string, string> = {
  delhi: 'India', 'new delhi': 'India', mumbai: 'India', bengaluru: 'India', bangalore: 'India',
  hyderabad: 'India', chennai: 'India', pune: 'India', kolkata: 'India', ahmedabad: 'India',
  jaipur: 'India', noida: 'India', gurugram: 'India', gurgaon: 'India', chandigarh: 'India',
  goa: 'India', kochi: 'India', cochin: 'India', indore: 'India', lucknow: 'India', surat: 'India',
  nagpur: 'India', bhopal: 'India', coimbatore: 'India', vadodara: 'India', visakhapatnam: 'India',
  dubai: 'UAE', 'abu dhabi': 'UAE', singapore: 'Singapore', london: 'UK', 'new york': 'USA',
  'san francisco': 'USA', dublin: 'Ireland', berlin: 'Germany', paris: 'France', tokyo: 'Japan',
};
const KNOWN_COUNTRIES = ['india', 'usa', 'united states', 'uk', 'united kingdom', 'uae', 'singapore', 'germany', 'france', 'japan', 'ireland', 'canada', 'australia'];
function inferLocationFromName(name: string): { city: string; country: string } {
  const n = (name || '').toLowerCase();
  for (const city in KNOWN_CITIES) {
    if (new RegExp('\\b' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(n)) {
      return { city: city.replace(/\b\w/g, (c) => c.toUpperCase()), country: KNOWN_CITIES[city] };
    }
  }
  for (const c of KNOWN_COUNTRIES) {
    if (new RegExp('\\b' + c + '\\b').test(n)) {
      return { city: '', country: c.replace(/\b\w/g, (ch) => ch.toUpperCase()) };
    }
  }
  return { city: '', country: '' };
}
function computeDerived(e: PartnershipEvent): Derived {
  const today = startOfToday();
  const statusBucket = classifyStatus(e.partnershipStatus);
  const startMs = parseYmd(e.eventStartDate);
  const explicitEndMs = parseYmd(e.eventEndDate);
  const effectiveEndMs = explicitEndMs ?? startMs;
  const refMs = effectiveEndMs ?? startMs;
  const isExpired = refMs !== null ? refMs < today : false;
  const dateOrderSuspect = !!(startMs !== null && explicitEndMs !== null && explicitEndMs < startMs);
  const lastUpdMs = parseYmd(e.lastUpdatedDate) ?? parseYmd(e.initiatedDate);
  const daysInStatus = lastUpdMs !== null ? daysBetween(today, lastUpdMs) : null;
  const partnershipTypeResolved = e.partnershipType || (e.country ? (isIndia(e.country) ? 'Domestic' : 'International') : '');
  const listingResolved = normalizeListing(e.listing, e.listingLink, statusBucket);
  return { statusBucket, isExpired, dateOrderSuspect, daysInStatus, listingResolved, partnershipTypeResolved };
}

/* ============================================================
   EXCEL IMPORT (header auto-mapping, multi-file / multi-sheet)
   ============================================================ */
const FIELD_ALIASES: Record<string, string[]> = {
  eventName: ['nameoftheevent', 'nameofevent', 'eventname', 'eventtitle', 'titleoftheevent'],
  city: ['city'],
  country: ['country'],
  organiser: ['organisercompanyname', 'organizercompanyname', 'organisername', 'companyname', 'organiser', 'organizer'],
  poc: ['pocname', 'poc'],
  contact: ['contactno', 'contactnumber', 'phone', 'mobileno', 'mobile'],
  email: ['emailid', 'email'],
  website: ['websitelink', 'website'],
  initiatedDate: ['initiateddate', 'initiationdate', 'dateinitiated'],
  eventStartDate: ['eventstartdate', 'startdate', 'eventdate', 'dateofevent'],
  eventEndDate: ['eventenddate', 'enddate'],
  partnershipStatus: ['partnershipstatus', 'status'],
  partnershipType: ['partnershiptypedomesticorinternational', 'partnershiptype', 'domesticorinternational'],
  lastUpdatedDate: ['lastupdateddate', 'lastupdated'],
  comment: ['comment', 'comments', 'remarks'],
  listing: ['listingyesinprocessno', 'listing'],
  listingLink: ['listinglinkifyes', 'listinglink'],
};
function normKey(s: unknown): string {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
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
      return FIELD_ALIASES[field].some((a) => a.length >= 4 && (nh.includes(a) || a.includes(nh)));
    });
    if (hit) { map[field] = hit; used.add(hit); }
  }
  return map;
}
function excelDateToYmd(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } catch { /* fall through */ }
    return '';
  }
  const s = String(v).trim();
  if (!s) return '';
  const token = s.match(/\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/);
  const use = token ? token[0] : s;
  const parts = use.split(/[/\-.]/);
  if (parts.length !== 3) {
    const d = new Date(use);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const [p1, p2, p3] = parts.map((p) => parseInt(p, 10));
  if (parts[0].length === 4) return `${p1}-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
  let y = p3;
  if (y < 100) y += 2000;
  if (!p1 || !p2 || p2 > 12) return '';
  return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
}
interface ImportStats {
  unparseableDates: number;
  locationsGuessed: number;
}
function rowToDraft(row: Record<string, unknown>, map: Record<string, string>, source: string, stats: ImportStats): EventDraft | null {
  const get = (f: string) => (map[f] !== undefined ? row[map[f]] : '');
  const eventName = String(get('eventName') || '').trim();
  if (!eventName) return null;
  const draft = emptyDraft();
  draft.eventName = eventName;
  draft.source = source;
  const textFields = ['city', 'country', 'organiser', 'poc', 'contact', 'email', 'website', 'partnershipStatus', 'partnershipType', 'comment', 'listing', 'listingLink'] as const;
  for (const f of textFields) draft[f] = String(get(f) || '').trim();
  draft.website = cleanWebsite(draft.website);

  const dateFields = ['initiatedDate', 'eventStartDate', 'eventEndDate', 'lastUpdatedDate'] as const;
  for (const f of dateFields) {
    const raw = get(f);
    const rawText = raw === null || raw === undefined ? '' : String(raw).trim();
    draft[f] = excelDateToYmd(raw);
    if (rawText && !draft[f]) stats.unparseableDates++;
  }

  if (!draft.city && !draft.country) {
    const guess = inferLocationFromName(eventName);
    if (guess.city || guess.country) {
      draft.city = guess.city;
      draft.country = guess.country;
      stats.locationsGuessed++;
    }
  }
  return draft;
}
function readSheetRows(ws: XLSX.WorkSheet): { rows: Record<string, unknown>[]; headers: string[] } {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return { rows: [], headers: [] };
  const headers = (aoa[0] as unknown[]).map((h) => String(h).trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, ci) => { if (h !== '') obj[h] = (aoa[i] as unknown[])[ci]; });
    if (Object.values(obj).some((v) => String(v).trim() !== '')) rows.push(obj);
  }
  return { rows, headers };
}

function downloadEventsExcel(list: PartnershipEvent[], filename: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(list.map(partnershipEventToExportRow), { header: STANDARD_HEADERS as unknown as string[] });
  ws['!cols'] = STANDARD_HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Events');
  XLSX.writeFile(wb, filename);
}

/* ============================================================
   SMALL HELPERS
   ============================================================ */
function fmtDisplay(ymd: string): string {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function monthKey(ymd: string): string {
  return ymd.slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, { ...init, headers: { ...getAuthHeaders(), ...(init?.headers || {}) } });
  return res.json();
}

/* ============================================================
   PAGE
   ============================================================ */
export default function PartnershipTrackerPage() {
  const [events, setEvents] = useState<PartnershipEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [chartsExpanded, setChartsExpanded] = useState(false);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [busy, setBusy] = useState(false);
  interface ImportLogEntry {
    imported: number; dropped: number; duplicates: number; unparseableDates: number; locationsGuessed: number;
    sheetsRead: { name: string; rows: number }[];
    sheetsSkipped: { name: string; reason: string }[];
  }
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPanelRef = useRef<HTMLDivElement>(null);

  interface ImportProgress { label: string; current: number; total: number }
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  function showToast(msg: string, kind: 'success' | 'error' = 'success') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  }

  async function loadEvents() {
    const res = await api<PartnershipEvent[]>('/api/admin/partnership-events?limit=50000');
    if (res.success && res.data) setEvents(res.data);
    else showToast(res.error || 'Failed to load events', 'error');
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadEvents();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!importPanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (!importPanelRef.current?.contains(e.target as Node)) setImportPanelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [importPanelOpen]);

  const derivedById = useMemo(() => {
    const map = new Map<number, Derived>();
    events.forEach((e) => map.set(e.id, computeDerived(e)));
    return map;
  }, [events]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let listed = 0, expired = 0, unmapped = 0;
    events.forEach((e) => {
      const d = derivedById.get(e.id)!;
      byStatus[d.statusBucket] = (byStatus[d.statusBucket] || 0) + 1;
      if (d.listingResolved.toLowerCase() === 'yes') listed++;
      if (d.isExpired) expired++;
      if (d.statusBucket === 'Unmapped') unmapped++;
    });
    return { byStatus, listed, expired, unmapped, total: events.length };
  }, [events, derivedById]);

  const filtered = useMemo(() => {
    let list = events.slice();
    if (monthFilter) list = list.filter((e) => e.eventStartDate && monthKey(e.eventStartDate) === monthFilter);
    if (cardFilter === 'Listed') list = list.filter((e) => derivedById.get(e.id)!.listingResolved.toLowerCase() === 'yes');
    else if (cardFilter === 'Expired') list = list.filter((e) => derivedById.get(e.id)!.isExpired);
    else if (cardFilter) list = list.filter((e) => derivedById.get(e.id)!.statusBucket === cardFilter);

    const q = deferredSearch.trim().toLowerCase();
    if (q) list = list.filter((e) => e.eventName.toLowerCase().includes(q) || e.organiser.toLowerCase().includes(q) || e.poc.toLowerCase().includes(q));

    if (statusFilter !== 'all') list = list.filter((e) => derivedById.get(e.id)!.statusBucket === statusFilter);
    if (typeFilter !== 'all') list = list.filter((e) => derivedById.get(e.id)!.partnershipTypeResolved === typeFilter);
    if (listingFilter !== 'all') list = list.filter((e) => derivedById.get(e.id)!.listingResolved.toLowerCase() === listingFilter.toLowerCase());
    if (timelineFilter === 'upcoming') list = list.filter((e) => !derivedById.get(e.id)!.isExpired);
    else if (timelineFilter === 'expired') list = list.filter((e) => derivedById.get(e.id)!.isExpired);

    if (sortKey) {
      list.sort((a, b) => {
        let av: string | number = '', bv: string | number = '';
        if (sortKey === 'daysInStatus') {
          av = derivedById.get(a.id)!.daysInStatus ?? -Infinity;
          bv = derivedById.get(b.id)!.daysInStatus ?? -Infinity;
        } else {
          av = (a as unknown as Record<string, string>)[sortKey] || '';
          bv = (b as unknown as Record<string, string>)[sortKey] || '';
          if (typeof av === 'string') av = av.toLowerCase();
          if (typeof bv === 'string') bv = bv.toLowerCase();
        }
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      });
    }
    return list;
  }, [events, derivedById, monthFilter, cardFilter, deferredSearch, statusFilter, typeFilter, listingFilter, timelineFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageList = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const CHART_STATUSES = [...STATUS_ORDER, 'Unmapped'];
  const momData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    events.forEach((e) => {
      if (!e.eventStartDate) return;
      const key = monthKey(e.eventStartDate);
      const bucket = derivedById.get(e.id)?.statusBucket || 'Unmapped';
      if (!map[key]) map[key] = {};
      map[key][bucket] = (map[key][bucket] || 0) + 1;
    });
    const keys = Object.keys(map).sort().slice(-12);
    const totals = keys.map((k) => Object.values(map[k]).reduce((a, b) => a + b, 0));
    const max = Math.max(1, ...totals);
    return { keys, map, max };
  }, [events, derivedById]);

  const YOY_PALETTE = ['#2563C7', '#1E9E64', '#B9790A', '#C22B44', '#7C3FE0', '#0E7C8B'];
  const yoyData = useMemo(() => {
    const grid: Record<number, number[]> = {};
    events.forEach((e) => {
      if (!e.eventStartDate) return;
      const d = new Date(e.eventStartDate + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear(), m = d.getMonth();
      if (!grid[y]) grid[y] = new Array(12).fill(0);
      grid[y][m]++;
    });
    const years = Object.keys(grid).map(Number).sort((a, b) => a - b);
    const max = Math.max(1, ...years.flatMap((y) => grid[y]));
    return { years, grid, max };
  }, [events]);

  function resetToPage1() { setPage(1); }
  function clearFilters() {
    setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setListingFilter('all'); setTimelineFilter('all');
    setCardFilter(null); setMonthFilter(null); setSortKey(null); setPage(1);
  }
  function setCard(bucket: string | null) { setCardFilter(bucket); setMonthFilter(null); setPage(1); }
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
    setPage(1);
  }

  /* ---------------- CRUD ---------------- */
  function openAddModal() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalError('');
    setModalOpen(true);
  }
  function openEditModal(e: PartnershipEvent) {
    setEditingId(e.id);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = e;
    void _id; void _createdAt; void _updatedAt;
    setDraft(rest);
    setModalError('');
    setModalOpen(true);
  }
  async function saveModal() {
    if (!draft.eventName.trim()) { setModalError('Event name is required.'); return; }
    const key = dedupKey(draft);
    const clashesWithOther = key !== null && events.some((x) => x.id !== editingId && dedupKey(x) === key);
    if (clashesWithOther) {
      setModalError('An event with this exact name + city + country + start date already exists — not saved.');
      return;
    }
    setSaving(true);
    setModalError('');
    const payload = { ...draft, website: cleanWebsite(draft.website) };
    const res = editingId
      ? await api(`/api/admin/partnership-events/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await api('/api/admin/partnership-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.success) {
      showToast(editingId ? 'Event updated.' : 'Event added.');
      setModalOpen(false);
      await loadEvents();
    } else {
      setModalError(res.error || 'Save failed.');
    }
  }
  async function deleteEvent(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await api(`/api/admin/partnership-events/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Event deleted.');
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      showToast(res.error || 'Delete failed.', 'error');
    }
  }
  async function updateStatusInline(id: number, newStatus: string) {
    const target = events.find((e) => e.id === id);
    const patch: Partial<EventDraft> = { partnershipStatus: newStatus };
    if (target && classifyStatus(target.partnershipStatus) !== newStatus) {
      patch.lastUpdatedDate = new Date().toISOString().slice(0, 10);
    }
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const res = await api(`/api/admin/partnership-events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.success) {
      showToast(res.error || 'Status update failed.', 'error');
      await loadEvents();
    }
  }
  async function runBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} selected event(s)? This cannot be undone.`)) return;
    setBusy(true);
    const res = await api('/api/admin/partnership-events/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds], action: 'delete' }),
    });
    setBusy(false);
    if (res.success) {
      showToast(`${selectedIds.size} event(s) deleted.`);
      setSelectedIds(new Set());
      await loadEvents();
    } else {
      showToast(res.error || 'Bulk delete failed.', 'error');
    }
  }

  /* ---------------- Import ---------------- */
  const IMPORT_BATCH_SIZE = 300;

  async function handleImportFiles(fileList: FileList) {
    setBusy(true);
    const files = Array.from(fileList);
    setImportProgress({ label: files.length > 1 ? `Reading file 1 of ${files.length}…` : `Reading ${files[0].name}…`, current: 0, total: files.length });
    const seen = new Set<string>();
    events.forEach((e) => { const k = dedupKey(e); if (k) seen.add(k); });

    const allDrafts: EventDraft[] = [];
    const stats: ImportStats = { unparseableDates: 0, locationsGuessed: 0 };
    const sheetsRead: { name: string; rows: number }[] = [];
    const sheetsSkipped: { name: string; reason: string }[] = [];
    let dropped = 0, duplicates = 0;

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      setImportProgress({ label: files.length > 1 ? `Reading file ${fi + 1} of ${files.length} — ${file.name}` : `Reading ${file.name}…`, current: fi, total: files.length });
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        for (const sheetName of wb.SheetNames) {
          const label = fileList.length > 1 ? `${file.name} — ${sheetName}` : sheetName;
          const { rows, headers } = readSheetRows(wb.Sheets[sheetName]);
          if (!rows.length) {
            sheetsSkipped.push({ name: label, reason: 'Empty, or only a header row with no data below it.' });
            continue;
          }
          const map = buildHeaderMap(headers);
          const headerPreview = headers.filter((h) => h.trim()).join(' | ') || '(blank header row)';
          if (map.eventName === undefined && map.partnershipStatus === undefined) {
            sheetsSkipped.push({ name: label, reason: `No column recognisable as "Name of the event" or "Partnership Status". Headers found: ${headerPreview}` });
            continue;
          }
          if (map.eventName === undefined) {
            sheetsSkipped.push({ name: label, reason: `Found a Partnership Status column, but no "Name of the event" column. Headers found: ${headerPreview}` });
            continue;
          }
          if (map.partnershipStatus === undefined) {
            sheetsSkipped.push({ name: label, reason: `Found a "Name of the event" column, but no Partnership Status column. Headers found: ${headerPreview}` });
            continue;
          }
          let rowsRead = 0;
          for (const row of rows) {
            const d = rowToDraft(row, map, sheetName, stats);
            if (!d) { dropped++; continue; }
            const key = dedupKey(d);
            if (key !== null) {
              if (seen.has(key)) { duplicates++; continue; }
              seen.add(key);
            }
            allDrafts.push(d);
            rowsRead++;
          }
          sheetsRead.push({ name: label, rows: rowsRead });
        }
      } catch (err) {
        sheetsSkipped.push({ name: file.name, reason: `Could not read this file: ${err instanceof Error ? err.message : 'unknown error'}` });
      }
    }

    if (!allDrafts.length) {
      setBusy(false);
      setImportProgress(null);
      setImportLog((prev) => [{ imported: 0, dropped, duplicates, unparseableDates: stats.unparseableDates, locationsGuessed: stats.locationsGuessed, sheetsRead, sheetsSkipped }, ...prev]);
      setImportPanelOpen(true);
      showToast('No importable rows found in the selected file(s).', 'error');
      return;
    }

    const totalRows = allDrafts.length;
    let imported = 0;
    let serverDropped = 0;
    let serverDuplicates = 0;
    let uploadFailed = false;

    for (let offset = 0; offset < totalRows; offset += IMPORT_BATCH_SIZE) {
      const batch = allDrafts.slice(offset, offset + IMPORT_BATCH_SIZE);
      setImportProgress({ label: `Uploading events — ${offset} of ${totalRows}…`, current: offset, total: totalRows });
      try {
        const res = await api<{ imported: number; dropped: number; duplicates: number }>('/api/admin/partnership-events/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: batch }),
        });
        if (res.success && res.data) {
          imported += res.data.imported;
          serverDropped += res.data.dropped;
          serverDuplicates += res.data.duplicates;
        } else {
          uploadFailed = true;
          showToast(res.error || 'Import failed partway through.', 'error');
          break;
        }
      } catch (err) {
        uploadFailed = true;
        showToast(`Import failed partway through: ${err instanceof Error ? err.message : 'network error'}`, 'error');
        break;
      }
    }
    setBusy(false);
    setImportProgress(null);
    setImportLog((prev) => [{
      imported,
      dropped: serverDropped + dropped,
      duplicates: serverDuplicates + duplicates,
      unparseableDates: stats.unparseableDates,
      locationsGuessed: stats.locationsGuessed,
      sheetsRead, sheetsSkipped,
    }, ...prev]);
    setImportPanelOpen(true);
    if (!uploadFailed) showToast(`Imported ${imported} event(s).`);
    await loadEvents();
  }

  /* ---------------- Render ---------------- */
  return (
    <AdminErrorBoundary>
      <div className="pt-wrap">
        <div className="pt-header">
          <div>
            <div className="pt-title">Partnership Tracker</div>
            <div className="pt-subtitle">Events, sponsorships and coverage partnerships in one place.</div>
          </div>
          <div className="pt-header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.length) handleImportFiles(e.target.files); e.target.value = ''; }}
            />
            {importLog.length > 0 && (
              <div className="pt-popover-wrap" ref={importPanelRef}>
                <button className="btn btn-sm" onClick={() => setImportPanelOpen((o) => !o)}>ℹ Import details</button>
                {importPanelOpen && (
                  <div className="pt-popover-panel">
                    {importLog.map((log, i) => (
                      <div className="pt-import-entry" key={i}>
                        <div>
                          Imported <strong>{log.imported}</strong> new event(s)
                          {log.duplicates ? <> · <span className="pt-warn">skipped {log.duplicates} duplicate(s)</span></> : null}
                          {log.dropped ? <> · ignored {log.dropped} row(s) with no event name</> : null}
                          {log.locationsGuessed ? <> · <span className="pt-warn">guessed city/country for {log.locationsGuessed} row(s)</span> from the event name — please verify</> : null}
                          {log.unparseableDates ? <> · <span className="pt-warn">{log.unparseableDates} date value(s) couldn&apos;t be read</span> and were left blank</> : null}
                        </div>
                        {log.sheetsRead.map((r) => (
                          <div key={r.name} className="pt-import-line">✓ <strong>{r.name}</strong> — {r.rows} row(s)</div>
                        ))}
                        {log.sheetsSkipped.map((s) => (
                          <div key={s.name} className="pt-import-line pt-warn">✕ <strong>{s.name}</strong> — {s.reason}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button className="btn" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              {busy ? (<span className="pt-btn-loading"><svg className="pt-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path></svg>Uploading…</span>) : 'Upload / merge Excel'}
            </button>
            <button className="btn btn-green" onClick={() => downloadEventsExcel(filtered, `partnership-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`)}>Download Excel</button>
            <button className="btn btn-accent" onClick={openAddModal}>+ Add event</button>
          </div>
        </div>

        {loading ? (
          <div className="pt-loading">Loading…</div>
        ) : (
          <>
            <div className="pt-cards">
              <div className={`pt-card pt-card-all ${cardFilter === null ? 'active' : ''}`} style={{ ['--dot' as string]: '#71798A' }} onClick={() => setCard(null)}>
                <div className="pt-card-label"><span className="pt-dot" />All events</div>
                <div className="pt-card-count">{counts.total}</div>
              </div>
              {STATUS_ORDER.map((s) => (
                <div key={s} className={`pt-card ${cardFilter === s ? 'active' : ''}`} style={{ ['--dot' as string]: STATUS_COLOR_HEX[s] }} onClick={() => setCard(s)}>
                  <div className="pt-card-label"><span className="pt-dot" />{s}</div>
                  <div className="pt-card-count">{counts.byStatus[s] || 0}</div>
                </div>
              ))}
              <div className={`pt-card ${cardFilter === 'Listed' ? 'active' : ''}`} style={{ ['--dot' as string]: '#7C3FE0' }} onClick={() => setCard('Listed')}>
                <div className="pt-card-label"><span className="pt-dot" />Listed</div>
                <div className="pt-card-count">{counts.listed}</div>
              </div>
              <div className={`pt-card ${cardFilter === 'Expired' ? 'active' : ''}`} style={{ ['--dot' as string]: '#3F4552' }} onClick={() => setCard('Expired')}>
                <div className="pt-card-label"><span className="pt-dot" />Expired</div>
                <div className="pt-card-count">{counts.expired}</div>
              </div>
              {counts.unmapped > 0 && (
                <div className={`pt-card ${cardFilter === 'Unmapped' ? 'active' : ''}`} style={{ ['--dot' as string]: '#9CA3AF' }} onClick={() => setCard('Unmapped')}>
                  <div className="pt-card-label"><span className="pt-dot" />Unmapped</div>
                  <div className="pt-card-count">{counts.unmapped}</div>
                </div>
              )}
            </div>

            {(momData.keys.length > 0 || yoyData.years.length > 0) && (
              <div className="pt-chart-toggle" onClick={() => setChartsExpanded((v) => !v)}>
                <span>📊 Graphs — month on month &amp; year on year</span>
                <span className="pt-chart-toggle-arrow">{chartsExpanded ? '▾' : '▸'}</span>
              </div>
            )}

            {chartsExpanded && (
              <div className="pt-charts-grid">
                {momData.keys.length > 0 && (
                  <div className="pt-chart-box">
                    <div className="pt-chart-title">Month on month</div>
                    <div className="pt-chart-sub">Events by start date, last 12 months, stacked by status · click a segment to filter the table</div>
                    <div className="pt-chart-bars">
                      {momData.keys.map((k) => (
                        <div key={k} className="pt-chart-col">
                          <div className="pt-chart-bar-track">
                            {CHART_STATUSES.map((s) => {
                              const count = momData.map[k]?.[s] || 0;
                              if (!count) return null;
                              const active = monthFilter === k && cardFilter === s;
                              return (
                                <div
                                  key={s}
                                  className="pt-chart-seg"
                                  style={{ height: `${(count / momData.max) * 100}%`, background: STATUS_COLOR_HEX[s], opacity: monthFilter && !active ? 0.5 : 1 }}
                                  title={`${s}: ${count}`}
                                  onClick={() => {
                                    const same = monthFilter === k && cardFilter === s;
                                    setMonthFilter(same ? null : k);
                                    setCardFilter(same ? null : s);
                                    setPage(1);
                                  }}
                                />
                              );
                            })}
                          </div>
                          <div className="pt-chart-label">{monthLabel(k)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-chart-legend">
                      {CHART_STATUSES.map((s) => (
                        <span key={s} className="pt-legend-item"><span className="pt-legend-dot" style={{ background: STATUS_COLOR_HEX[s] }} />{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {yoyData.years.length > 0 && (
                  <div className="pt-chart-box">
                    <div className="pt-chart-title">Year on year</div>
                    <div className="pt-chart-sub">Same month, across years · click a point to filter the table</div>
                    <svg viewBox="0 0 360 130" className="pt-yoy-svg" preserveAspectRatio="none">
                      {yoyData.years.map((y, yi) => {
                        const color = YOY_PALETTE[yi % YOY_PALETTE.length];
                        const points = yoyData.grid[y].map((c, mi) => {
                          const x = (mi / 11) * 340 + 10;
                          const yy = 110 - (c / yoyData.max) * 100;
                          return `${x},${yy}`;
                        }).join(' ');
                        return (
                          <g key={y}>
                            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
                            {yoyData.grid[y].map((c, mi) => {
                              const x = (mi / 11) * 340 + 10;
                              const yy = 110 - (c / yoyData.max) * 100;
                              const key = `${y}-${String(mi + 1).padStart(2, '0')}`;
                              const active = monthFilter === key;
                              return (
                                <circle
                                  key={mi} cx={x} cy={yy} r={active ? 4 : 2.5} fill={color} className="pt-yoy-point"
                                  onClick={() => { setMonthFilter(monthFilter === key ? null : key); setCardFilter(null); setPage(1); }}
                                >
                                  <title>{`${y} · ${c} event(s)`}</title>
                                </circle>
                              );
                            })}
                          </g>
                        );
                      })}
                    </svg>
                    <div className="pt-chart-legend">
                      {yoyData.years.map((y, yi) => (
                        <span key={y} className="pt-legend-item"><span className="pt-legend-dot" style={{ background: YOY_PALETTE[yi % YOY_PALETTE.length] }} />{y}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-toolbar">
              <div className="pt-search-wrap">
                <input placeholder="Search event, organiser, POC…" value={search} onChange={(e) => { setSearch(e.target.value); resetToPage1(); }} />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetToPage1(); }}>
                <option value="all">All statuses</option>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="Unmapped">Unmapped</option>
              </select>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetToPage1(); }}>
                <option value="all">Domestic + International</option>
                {PARTNERSHIP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="">Unspecified</option>
              </select>
              <select value={listingFilter} onChange={(e) => { setListingFilter(e.target.value); resetToPage1(); }}>
                <option value="all">Any listing status</option>
                <option value="Yes">Listed</option>
                <option value="In process">Listing in process</option>
                <option value="Pending">Pending</option>
                <option value="No">Not listed</option>
              </select>
              <select value={timelineFilter} onChange={(e) => { setTimelineFilter(e.target.value); resetToPage1(); }}>
                <option value="all">Upcoming + Expired</option>
                <option value="upcoming">Upcoming only</option>
                <option value="expired">Expired only</option>
              </select>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); resetToPage1(); }}>
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <span className="pt-clear" onClick={clearFilters}>Clear filters</span>
              {monthFilter && (
                <span className="pt-month-chip">
                  Showing: <strong>{monthLabel(monthFilter)}</strong>
                  <span className="pt-chip-x" onClick={() => setMonthFilter(null)}>✕</span>
                </span>
              )}
              <span className="pt-count-note">{filtered.length.toLocaleString()} of {events.length.toLocaleString()} events</span>
            </div>

            {selectedIds.size > 0 && (
              <div className="pt-bulk-bar">
                <span className="pt-bulk-count">{selectedIds.size} selected</span>
                <button className="btn btn-sm btn-danger" disabled={busy} onClick={runBulkDelete}>Delete selected</button>
                <span className="pt-bulk-link" onClick={() => setSelectedIds(new Set())}>Clear selection</span>
              </div>
            )}

            <div className="pt-tbl-wrap">
              <div className="pt-tbl-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="pt-col-chk">
                        <input
                          type="checkbox"
                          checked={pageList.length > 0 && pageList.every((e) => selectedIds.has(e.id))}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            pageList.forEach((ev) => { if (e.target.checked) next.add(ev.id); else next.delete(ev.id); });
                            setSelectedIds(next);
                          }}
                        />
                      </th>
                      <th className="pt-sticky" onClick={() => toggleSort('eventName')}>Event</th>
                      <th onClick={() => toggleSort('city')}>City</th>
                      <th onClick={() => toggleSort('country')}>Country</th>
                      <th onClick={() => toggleSort('organiser')}>Organiser</th>
                      <th onClick={() => toggleSort('poc')}>POC</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Website</th>
                      <th onClick={() => toggleSort('initiatedDate')}>Initiated</th>
                      <th onClick={() => toggleSort('eventStartDate')}>Start date</th>
                      <th onClick={() => toggleSort('eventEndDate')}>End date</th>
                      <th>Status</th>
                      <th onClick={() => toggleSort('daysInStatus')}>Days in status</th>
                      <th>Type</th>
                      <th onClick={() => toggleSort('lastUpdatedDate')}>Last updated</th>
                      <th>Listing</th>
                      <th>Comment</th>
                      <th className="pt-col-act">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageList.length === 0 ? (
                      <tr><td colSpan={18} className="pt-empty">No events match these filters.</td></tr>
                    ) : pageList.map((e) => {
                      const d = derivedById.get(e.id)!;
                      const color = STATUS_COLOR_HEX[d.statusBucket] || '#9CA3AF';
                      return (
                        <tr key={e.id} className={selectedIds.has(e.id) ? 'pt-row-selected' : ''}>
                          <td className="pt-col-chk">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(e.id)}
                              onChange={(ev) => {
                                const next = new Set(selectedIds);
                                if (ev.target.checked) next.add(e.id); else next.delete(e.id);
                                setSelectedIds(next);
                              }}
                            />
                          </td>
                          <td className="pt-sticky">
                            <div className="pt-ev-title pt-name-link" onClick={() => openEditModal(e)}>{e.eventName}</div>
                            {e.source && <div className="pt-ev-sub">{e.source}</div>}
                            {d.isExpired && <span className="pt-badge" style={{ color: '#3F4552' }}>Expired</span>}
                          </td>
                          <td>{e.city || <span className="pt-muted">—</span>}</td>
                          <td>{e.country || <span className="pt-muted">—</span>}</td>
                          <td>{e.organiser || <span className="pt-muted">—</span>}</td>
                          <td>{e.poc || <span className="pt-muted">—</span>}</td>
                          <td>{e.contact || <span className="pt-muted">—</span>}</td>
                          <td>{e.email || <span className="pt-muted">—</span>}</td>
                          <td>{e.website ? <a className="pt-link" href={e.website} target="_blank" rel="noopener">{e.website}</a> : <span className="pt-muted">—</span>}</td>
                          <td className="pt-mono">{fmtDisplay(e.initiatedDate)}</td>
                          <td className="pt-mono">{fmtDisplay(e.eventStartDate)}</td>
                          <td className="pt-mono">
                            {fmtDisplay(e.eventEndDate)}
                            {d.dateOrderSuspect && <span className="pt-badge" style={{ color: '#C22B44' }} title="End date is before start date">⚠ order</span>}
                          </td>
                          <td>
                            <select
                              className="pt-status-select"
                              style={{ color }}
                              value={d.statusBucket === 'Unmapped' ? '' : d.statusBucket}
                              onChange={(ev) => updateStatusInline(e.id, ev.target.value)}
                            >
                              {d.statusBucket === 'Unmapped' && <option value="" disabled>Unmapped</option>}
                              {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td>{d.daysInStatus !== null ? <span className="pt-mono">{d.daysInStatus}d</span> : <span className="pt-muted">—</span>}</td>
                          <td>{d.partnershipTypeResolved || <span className="pt-muted">—</span>}</td>
                          <td className="pt-mono">{fmtDisplay(e.lastUpdatedDate)}</td>
                          <td>{d.listingResolved}</td>
                          <td title={e.comment}>{e.comment || <span className="pt-muted">—</span>}</td>
                          <td className="pt-row-actions">
                            <button onClick={() => openEditModal(e)}>Edit</button>
                            <button className="del" onClick={() => deleteEvent(e.id, e.eventName)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div className="pt-pagination">
                  <span className="pt-page-info">Page {clampedPage} of {totalPages}</span>
                  <button disabled={clampedPage <= 1} onClick={() => setPage(1)}>« First</button>
                  <button disabled={clampedPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
                  <button disabled={clampedPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ›</button>
                  <button disabled={clampedPage >= totalPages} onClick={() => setPage(totalPages)}>Last »</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Import progress modal */}
        {importProgress && (
          <div className="pt-overlay open">
            <div className="pt-progress-modal">
              <div className="pt-progress-title">Uploading Excel…</div>
              <div className="pt-progress-label">{importProgress.label}</div>
              <div className="pt-progress-track">
                <div
                  className="pt-progress-fill"
                  style={{ width: `${importProgress.total ? Math.min(100, (importProgress.current / importProgress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="pt-progress-pct">
                {importProgress.total ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100)) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit modal */}
        <div className={`pt-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="pt-modal">
            <div className="pt-modal-header">
              <h2>{editingId ? 'Edit event' : 'Add event'}</h2>
              <button className="pt-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="pt-modal-body">
              <div className="pt-section-title">1. Event basics</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full">
                  <label>Name of the event *</label>
                  <input placeholder="e.g. Startup Mixer | Mumbai | 14 Mar 2026" value={draft.eventName} onChange={(e) => setDraft({ ...draft, eventName: e.target.value })} />
                  <div className="pt-hint">Format: Event Name | City | Date</div>
                </div>
                <div className="pt-fg"><label>City</label><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
                <div className="pt-fg"><label>Country</label><input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></div>
                <div className="pt-fg"><label>Organiser/Company Name</label><input value={draft.organiser} onChange={(e) => setDraft({ ...draft, organiser: e.target.value })} /></div>
                <div className="pt-fg"><label>POC - Name</label><input value={draft.poc} onChange={(e) => setDraft({ ...draft, poc: e.target.value })} /></div>
                <div className="pt-fg"><label>Contact No.</label><input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} /></div>
                <div className="pt-fg"><label>Email ID</label><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
                <div className="pt-fg pt-full"><label>Website Link</label><input value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></div>
              </div>

              <div className="pt-section-title">2. Event start &amp; end date/time</div>
              <div className="pt-form-grid">
                <div className="pt-fg"><label>Event Start Date</label><input type="date" value={draft.eventStartDate} onChange={(e) => setDraft({ ...draft, eventStartDate: e.target.value })} /></div>
                <div className="pt-fg"><label>Event Start Time</label><input type="time" value={draft.eventStartTime} onChange={(e) => setDraft({ ...draft, eventStartTime: e.target.value })} /></div>
                <div className="pt-fg"><label>Event End Date</label><input type="date" value={draft.eventEndDate} onChange={(e) => setDraft({ ...draft, eventEndDate: e.target.value })} /></div>
                <div className="pt-fg"><label>Event End Time</label><input type="time" value={draft.eventEndTime} onChange={(e) => setDraft({ ...draft, eventEndTime: e.target.value })} /></div>
                <div className="pt-fg"><label>Initiated date</label><input type="date" value={draft.initiatedDate} onChange={(e) => setDraft({ ...draft, initiatedDate: e.target.value })} /></div>
                <div className="pt-fg"><label>Last Updated Date</label><input type="date" value={draft.lastUpdatedDate} onChange={(e) => setDraft({ ...draft, lastUpdatedDate: e.target.value })} /></div>
              </div>

              <div className="pt-section-title">3. Venue</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full"><label>Complete Address</label><textarea value={draft.venueAddress} onChange={(e) => setDraft({ ...draft, venueAddress: e.target.value })} /></div>
                <div className="pt-fg pt-full"><label>Google Location (Maps link)</label><input value={draft.googleLocationLink} onChange={(e) => setDraft({ ...draft, googleLocationLink: e.target.value })} placeholder="https://maps.google.com/…" /></div>
              </div>

              <div className="pt-section-title">4. Event description</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full">
                  <textarea rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  <div className={`pt-hint ${draft.description.trim().length > 0 && draft.description.trim().length < EVENT_DESCRIPTION_MIN_LENGTH ? 'pt-hint-warn' : ''}`}>
                    {draft.description.trim().length} / {EVENT_DESCRIPTION_MIN_LENGTH} characters minimum
                  </div>
                </div>
              </div>

              <div className="pt-section-title">5. Event type &amp; ticketing</div>
              <div className="pt-form-grid">
                <div className="pt-fg">
                  <label>Event Type</label>
                  <select value={draft.eventType} onChange={(e) => setDraft({ ...draft, eventType: e.target.value, ...(e.target.value === 'Free' ? { ticketCurrency: '', ticketPrice: '' } : {}) })}>
                    <option value="">—</option>
                    {EVENT_TICKET_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {draft.eventType === 'Paid' && (
                  <>
                    <div className="pt-fg">
                      <label>Ticket starts from — Currency</label>
                      <select value={draft.ticketCurrency} onChange={(e) => setDraft({ ...draft, ticketCurrency: e.target.value })}>
                        <option value="">—</option>
                        {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="pt-fg"><label>Ticket starts from — Amount</label><input type="number" min="0" value={draft.ticketPrice} onChange={(e) => setDraft({ ...draft, ticketPrice: e.target.value })} /></div>
                  </>
                )}
              </div>

              <div className="pt-section-title">6. Key speakers / guests</div>
              {draft.speakers.map((sp, i) => (
                <div className="pt-speaker-row" key={i}>
                  <input placeholder="Name *" value={sp.name} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], name: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <input placeholder="Designation" value={sp.designation} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], designation: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <input placeholder="Company" value={sp.company} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], company: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <button type="button" className="pt-rm" onClick={() => setDraft({ ...draft, speakers: draft.speakers.filter((_, idx) => idx !== i) })}>✕</button>
                </div>
              ))}
              <span className="pt-add-line" onClick={() => setDraft({ ...draft, speakers: [...draft.speakers, emptySpeaker()] })}>+ Add speaker/guest</span>

              <div className="pt-section-title" style={{ marginTop: 18 }}>7. Event poster (event page listing)</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>{POSTER_SPEC}</div>
              <ImageUpload value={draft.posterUrl} onChange={(url) => setDraft({ ...draft, posterUrl: url })} label="Event poster" />

              <div className="pt-section-title">8. Event banner (homepage)</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>{BANNER_SPEC}</div>
              <ImageUpload value={draft.bannerUrl} onChange={(url) => setDraft({ ...draft, bannerUrl: url })} label="Homepage banner" />

              <div className="pt-section-title">9. Social media posts</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>Suggested content only — we&apos;ll recreate and finalise this to match our page before publishing.</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full"><textarea rows={4} value={draft.socialMediaPosts} onChange={(e) => setDraft({ ...draft, socialMediaPosts: e.target.value })} /></div>
              </div>

              <div className="pt-section-title">10. Social media creatives</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>{SOCIAL_CREATIVE_SPEC}</div>
              {draft.socialCreatives.map((url, i) => (
                <div className="pt-speaker-row" key={i}>
                  <div style={{ flex: 1 }}>
                    <ImageUpload value={url} onChange={(v) => { const next = [...draft.socialCreatives]; next[i] = v; setDraft({ ...draft, socialCreatives: next }); }} label={`Creative ${i + 1}`} />
                  </div>
                  <button type="button" className="pt-rm" onClick={() => setDraft({ ...draft, socialCreatives: draft.socialCreatives.filter((_, idx) => idx !== i) })}>✕</button>
                </div>
              ))}
              <span className="pt-add-line" onClick={() => setDraft({ ...draft, socialCreatives: [...draft.socialCreatives, ''] })}>+ Add creative</span>

              <div className="pt-section-title" style={{ marginTop: 18 }}>Partnership tracking</div>
              <div className="pt-form-grid">
                <div className="pt-fg">
                  <label>Partnership Status</label>
                  <select value={draft.partnershipStatus} onChange={(e) => setDraft({ ...draft, partnershipStatus: e.target.value })}>
                    <option value="">—</option>
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="pt-fg">
                  <label>Partnership Type</label>
                  <select value={draft.partnershipType} onChange={(e) => setDraft({ ...draft, partnershipType: e.target.value })}>
                    <option value="">—</option>
                    {PARTNERSHIP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="pt-fg">
                  <label>Listing</label>
                  <select value={draft.listing} onChange={(e) => setDraft({ ...draft, listing: e.target.value })}>
                    <option value="">—</option>
                    {LISTING_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="pt-fg"><label>Listing link (if yes)</label><input value={draft.listingLink} onChange={(e) => setDraft({ ...draft, listingLink: e.target.value })} /></div>
                <div className="pt-fg pt-full"><label>Internal comment</label><textarea value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></div>
              </div>
              {modalError && <div className="pt-modal-error">{modalError}</div>}
            </div>
            <div className="pt-modal-footer">
              {editingId && (
                <button
                  className="btn btn-danger"
                  style={{ marginRight: 'auto' }}
                  onClick={() => { setModalOpen(false); deleteEvent(editingId, draft.eventName); }}
                >
                  Delete event
                </button>
              )}
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-accent" disabled={saving} onClick={saveModal}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add event'}</button>
            </div>
          </div>
        </div>

        {toast && <div className={`pt-toast ${toast.kind}`}>{toast.msg}</div>}
      </div>

      <style jsx global>{`
        .pt-wrap {
          --bg: #F5F6F8; --surface: #FFFFFF; --surface-2: #EEF0F3; --border: #DCE0E6;
          --text: #1B1F26; --muted: #5B6472; --faint: #71798A; --accent: #2563C7;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px; color: var(--text);
        }
        .pt-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
        .pt-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.3px; }
        .pt-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
        .pt-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .pt-loading { padding: 40px; text-align: center; color: var(--muted); }
        .pt-btn-loading { display: inline-flex; align-items: center; gap: 6px; }
        .pt-spinner { animation: pt-spin 1s linear infinite; }
        @keyframes pt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .btn { height: 36px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .btn:hover { background: var(--surface-2); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-accent { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
        .btn-green { background: #1E9E64; border-color: #1E9E64; color: #fff; font-weight: 600; }
        .btn-danger { color: #C22B44; border-color: #C22B44; }
        .btn-danger:hover { background: rgba(194,43,68,0.08); }
        .btn-sm { height: 30px; padding: 0 10px; font-size: 12px; }

        .pt-popover-wrap { position: relative; }
        .pt-popover-panel {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 14px 16px; width: 440px; max-width: 90vw; max-height: 60vh; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.14);
          font-size: 12.5px; color: var(--muted); line-height: 1.5;
        }
        .pt-import-entry { padding: 8px 0; border-bottom: 1px solid var(--border); }
        .pt-import-entry:last-child { border-bottom: none; }
        .pt-import-line { padding: 3px 0; }
        .pt-warn { color: #B9790A; }

        .pt-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 18px; }
        .pt-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 15px; cursor: pointer; transition: border-color .15s, transform .15s; }
        .pt-card:hover { border-color: var(--faint); transform: translateY(-1px); }
        .pt-card.active { border-color: var(--dot); box-shadow: 0 0 0 1px var(--dot) inset; }
        .pt-card-all { background: linear-gradient(135deg, var(--surface), var(--surface-2)); }
        .pt-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dot); display: inline-block; margin-right: 6px; }
        .pt-card-label { font-size: 11.5px; color: var(--muted); display: flex; align-items: center; }
        .pt-card-count { font-size: 24px; font-weight: 700; margin-top: 5px; }

        .pt-chart-toggle { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 16px; margin-bottom: 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; transition: border-color .15s; }
        .pt-chart-toggle:hover { border-color: var(--faint); }
        .pt-chart-toggle-arrow { color: var(--muted); }
        .pt-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        @media (max-width: 900px) { .pt-charts-grid { grid-template-columns: 1fr; } }
        .pt-chart-box { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
        .pt-chart-title { font-size: 13px; font-weight: 600; }
        .pt-chart-sub { color: var(--muted); font-size: 11.5px; margin-bottom: 12px; }
        .pt-chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 140px; }
        .pt-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .pt-chart-bar-track { flex: 1; width: 100%; display: flex; flex-direction: column-reverse; align-items: stretch; }
        .pt-chart-seg { width: 100%; cursor: pointer; transition: opacity .15s; }
        .pt-chart-seg:first-child { border-radius: 4px 4px 0 0; }
        .pt-chart-label { font-size: 10px; color: var(--muted); margin-top: 6px; white-space: nowrap; }
        .pt-chart-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .pt-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--muted); }
        .pt-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .pt-yoy-svg { width: 100%; height: 140px; }
        .pt-yoy-point { cursor: pointer; }

        .pt-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
        .pt-search-wrap input { width: 240px; height: 36px; padding: 0 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; outline: none; }
        .pt-wrap select { height: 36px; padding: 0 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 12.5px; outline: none; cursor: pointer; }
        .pt-clear { color: var(--muted); font-size: 12.5px; cursor: pointer; text-decoration: underline; }
        .pt-count-note { color: var(--muted); font-size: 12.5px; margin-left: auto; white-space: nowrap; }
        .pt-month-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 12px; }
        .pt-chip-x { cursor: pointer; }

        .pt-bulk-bar { display: flex; align-items: center; gap: 10px; background: rgba(37,99,199,0.08); border: 1px solid rgba(37,99,199,0.28); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
        .pt-bulk-count { font-size: 12px; font-weight: 700; color: var(--accent); }
        .pt-bulk-link { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 600; margin-left: auto; }

        .pt-tbl-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .pt-tbl-scroll { overflow: auto; max-height: 65vh; }
        .pt-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1750px; }
        .pt-wrap thead th { text-align: left; padding: 11px 14px; color: var(--muted); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--border); background: var(--surface-2); cursor: pointer; white-space: nowrap; position: sticky; top: 0; z-index: 3; }
        .pt-col-chk { width: 38px; cursor: default !important; }
        .pt-sticky { position: sticky; left: 0; background: var(--surface); z-index: 2; box-shadow: 1px 0 0 var(--border); }
        thead .pt-sticky { z-index: 4; background: var(--surface-2); }
        .pt-wrap tbody tr { border-bottom: 1px solid var(--border); }
        .pt-wrap tbody tr:last-child { border-bottom: none; }
        .pt-wrap tbody tr:hover td { background: var(--surface-2); }
        .pt-row-selected td { background: rgba(37,99,199,0.08) !important; }
        .pt-wrap td { padding: 10px 14px; vertical-align: middle; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pt-ev-title { font-weight: 600; }
        .pt-name-link { cursor: pointer; }
        .pt-name-link:hover { color: var(--accent); text-decoration: underline; }
        .pt-ev-sub { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
        .pt-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; border: 1px solid currentColor; padding: 2px 7px; border-radius: 20px; margin-left: 6px; white-space: nowrap; }
        .pt-mono { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: 12px; }
        .pt-muted { color: var(--faint); }
        .pt-link { color: var(--accent); }
        .pt-status-select { border-radius: 20px; font-size: 11.5px; font-weight: 500; padding: 3px 8px; border: 1px solid currentColor; cursor: pointer; background: var(--surface); }
        .pt-empty { padding: 44px; text-align: center; color: var(--muted); }
        .pt-row-actions { display: flex; gap: 6px; }
        .pt-row-actions button { background: var(--surface-2); border: 1px solid var(--border); color: var(--muted); cursor: pointer; padding: 4px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .pt-row-actions button:hover { background: var(--border); color: var(--text); }
        .pt-row-actions button.del { color: #C22B44; border-color: rgba(194,43,68,0.35); background: rgba(194,43,68,0.06); }
        .pt-row-actions button.del:hover { background: rgba(194,43,68,0.14); }

        .pt-pagination { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--border); font-size: 12.5px; color: var(--muted); }
        .pt-page-info { margin-right: auto; }
        .pt-pagination button { height: 30px; padding: 0 12px; border-radius: 7px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
        .pt-pagination button:disabled { opacity: .4; cursor: default; }

        .pt-overlay { display: none; position: fixed; inset: 0; background: rgba(16,26,43,0.45); z-index: 1000; align-items: center; justify-content: center; padding: 20px; }
        .pt-overlay.open { display: flex; }
        .pt-modal { background: var(--surface); border-radius: 14px; width: 720px; max-width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(16,26,43,0.25); }
        .pt-modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--surface); z-index: 1; }
        .pt-modal-header h2 { font-size: 16px; margin: 0; }
        .pt-modal-close { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; }
        .pt-modal-body { padding: 20px 24px; }
        .pt-section-title { font-size: 12px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: .4px; margin: 18px 0 10px; }
        .pt-section-title:first-child { margin-top: 0; }
        .pt-hint { font-size: 11px; color: var(--faint); }
        .pt-hint-warn { color: #B9790A; }
        .pt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
        .pt-fg { display: flex; flex-direction: column; gap: 5px; }
        .pt-fg.pt-full { grid-column: 1/-1; }
        .pt-fg label { font-size: 11px; color: var(--muted); }
        .pt-fg input, .pt-fg select, .pt-fg textarea { min-height: 36px; padding: 0 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; outline: none; font-family: inherit; }
        .pt-fg textarea { min-height: 64px; padding: 10px 12px; resize: vertical; width: 100%; }
        .pt-speaker-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: flex-start; }
        .pt-speaker-row input { flex: 1; height: 36px; padding: 0 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text); }
        .pt-speaker-row .pt-rm { width: 34px; height: 36px; flex: 0 0 34px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; color: var(--muted); font-size: 14px; }
        .pt-add-line { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 600; display: inline-block; margin-top: 2px; }
        .pt-modal-error { color: #C22B44; font-size: 12px; margin-top: 10px; }
        .pt-modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; align-items: center; }

        .pt-progress-modal { background: var(--surface); border-radius: 14px; width: 420px; max-width: 100%; padding: 24px; box-shadow: 0 24px 48px rgba(16,26,43,0.25); }
        .pt-progress-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .pt-progress-label { font-size: 12.5px; color: var(--muted); margin-bottom: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pt-progress-track { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; }
        .pt-progress-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
        .pt-progress-pct { margin-top: 8px; font-size: 12px; color: var(--muted); text-align: right; }

        .pt-toast { position: fixed; bottom: 24px; right: 24px; background: var(--text); color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 2000; box-shadow: 0 8px 24px rgba(16,26,43,0.25); }
        .pt-toast.success { background: #1E9E64; }
        .pt-toast.error { background: #C22B44; }

        @media (max-width: 980px) {
          .pt-search-wrap input { width: 160px; }
        }
      `}</style>
    </AdminErrorBoundary>
  );
}
