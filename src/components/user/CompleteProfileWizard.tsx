'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Briefcase, Building2, Check, ChevronDown, Globe, Lock, Mail, MapPin,
  Pencil, Phone, Plus, Sparkles, Trash2, TrendingUp, User, Users, X,
} from 'lucide-react';
import { RiLinkedinBoxFill } from '@remixicon/react';
import { COUNTRIES } from '@/constants/countries';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { COUNTRY_CODE_OPTIONS, PHONE_RULES } from '@/components/ui/constants/phone';
import { phoneCodeTextWidth } from '@/components/ui/PhoneField';
import {
  REGISTRATION_CATEGORIES, INVESTOR_TYPES, CHECK_SIZES, STAGE_FOCUS, ENTITY_TYPES,
  STARTUP_STAGES, TEAM_SIZES, REVENUE_STATUSES, ROUND_TYPES,
} from '@/constants/registrationCategories';

interface NLCategory { id: number; name: string; slug: string; color: string; }
interface Founder { name: string; role: string; linkedin_url: string; }
interface FundingRound { round_type: string; amount: string; lead_investor: string; round_date: string; }

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));

// Same dial-code list and per-country digit rules as the public forms' PhoneField
// (/feature-your-startup, /submit-funding-round): trigger shows "IN +91", the list adds the name.
const DIAL_CODES = COUNTRY_CODE_OPTIONS.filter((c) => c.code !== 'other');
const DEFAULT_PHONE_CODE = '+91';
// India (most members) pinned first, then every other code alphabetically by country.
const PHONE_CODE_OPTIONS = [...DIAL_CODES]
  .sort((a, b) => Number(b.code === DEFAULT_PHONE_CODE) - Number(a.code === DEFAULT_PHONE_CODE))
  .map((c) => ({ value: c.code, label: `${c.iso.toUpperCase()} ${c.code}`, detail: c.name, keywords: c.keywords }));

/** Stored phone ("+91 9876543210", or an older "+919876543210" with no space) → code + digits.
 * Without a space the longest dial code that prefixes the digits wins, so "+1876…" is Jamaica. */
function splitPhone(stored: string): { code: string; number: string } {
  const raw = stored.trim();
  if (!raw) return { code: DEFAULT_PHONE_CODE, number: '' };
  const spaced = raw.match(/^(\+\d{1,5})\s+(.*)$/);
  if (spaced && PHONE_RULES[spaced[1]]) return { code: spaced[1], number: spaced[2].replace(/\D/g, '') };
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    const match = DIAL_CODES
      .map((c) => c.code)
      .filter((code) => digits.startsWith(code.slice(1)))
      .sort((a, b) => b.length - a.length)[0];
    if (match) return { code: match, number: digits.slice(match.length - 1) };
  }
  return { code: DEFAULT_PHONE_CODE, number: digits };
}

function phoneError(code: string, number: string): string {
  const rule = PHONE_RULES[code] || PHONE_RULES.other;
  if (!number) return 'Phone number is required.';
  return rule.pattern.test(number) ? '' : rule.message;
}

/** The dial code that belongs to a picked country, for pre-filling an empty phone field. */
function codeForCountry(country: string): string | undefined {
  const name = country.trim().toLowerCase();
  return DIAL_CODES.find((c) => c.keywords.some((k) => k.toLowerCase() === name))?.code;
}

const BRAND = '#ee1761';

// Shared field skin. The dashboard's Tailwind build skips Preflight, so every control resets its
// own font, border and background instead of relying on a base layer.
// Horizontal padding is left to each variant so no two padding utilities ever compete.
const INPUT_SHAPE = 'box-border w-full rounded-xl border border-solid font-[inherit] text-[15px] font-medium outline-none transition placeholder:font-normal placeholder:text-[#b5b0bd]';
const INPUT_BASE = `${INPUT_SHAPE} h-12 border-db-line bg-white text-db-ink hover:border-[#d4cfdc] focus:border-db-pink focus:ring-4 focus:ring-db-pink/10`;
const INPUT = `${INPUT_BASE} px-4`;
const INPUT_INVALID = `${INPUT_SHAPE} h-12 border-[#f04438] bg-white text-db-ink focus:ring-4 focus:ring-[#f04438]/10`;
const TEXTAREA = `${INPUT_SHAPE} min-h-[104px] resize-y border-db-line bg-white px-4 py-3 leading-relaxed text-db-ink hover:border-[#d4cfdc] focus:border-db-pink focus:ring-4 focus:ring-db-pink/10`;
const INPUT_READONLY = `${INPUT_SHAPE} h-12 cursor-not-allowed truncate border-db-line bg-db-bg pl-11 pr-10 text-db-muted`;

// CustomSelect renders its own class names (shared with the public forms), so it's dressed from
// the wrapper with arbitrary variants to match INPUT.
export const SELECT_SKIN = [
  '[&_.custom-select-wrap]:relative [&_.custom-select-wrap]:w-full',
  '[&_.custom-select-btn]:box-border [&_.custom-select-btn]:flex [&_.custom-select-btn]:h-12 [&_.custom-select-btn]:w-full [&_.custom-select-btn]:cursor-text [&_.custom-select-btn]:items-center [&_.custom-select-btn]:gap-2 [&_.custom-select-btn]:rounded-xl [&_.custom-select-btn]:border [&_.custom-select-btn]:border-solid [&_.custom-select-btn]:border-db-line [&_.custom-select-btn]:bg-white [&_.custom-select-btn]:px-4 [&_.custom-select-btn]:transition',
  '[&_.custom-select-btn:hover]:border-[#d4cfdc] [&_.custom-select-btn.open]:border-db-pink [&_.custom-select-btn.open]:ring-4 [&_.custom-select-btn.open]:ring-db-pink/10',
  '[&_input.cs-input]:m-0 [&_input.cs-input]:min-w-0 [&_input.cs-input]:flex-1 [&_input.cs-input]:border-0 [&_input.cs-input]:bg-transparent [&_input.cs-input]:p-0 [&_input.cs-input]:font-[inherit] [&_input.cs-input]:text-[15px] [&_input.cs-input]:font-medium [&_input.cs-input]:text-db-ink [&_input.cs-input]:outline-none',
  '[&_input.cs-input::placeholder]:font-medium [&_input.cs-input::placeholder]:text-db-ink',
  '[&_.caret]:shrink-0 [&_.caret]:text-[11px] [&_.caret]:text-db-muted [&_.caret]:transition-transform [&_.custom-select-btn.open_.caret]:rotate-180',
  '[&_.custom-select-list]:absolute [&_.custom-select-list]:left-0 [&_.custom-select-list]:right-0 [&_.custom-select-list]:top-[calc(100%+6px)] [&_.custom-select-list]:z-[60] [&_.custom-select-list]:m-0 [&_.custom-select-list]:hidden [&_.custom-select-list]:max-h-60 [&_.custom-select-list]:list-none [&_.custom-select-list]:overflow-y-auto [&_.custom-select-list]:rounded-xl [&_.custom-select-list]:border [&_.custom-select-list]:border-solid [&_.custom-select-list]:border-db-line [&_.custom-select-list]:bg-white [&_.custom-select-list]:p-1.5 [&_.custom-select-list]:shadow-[0_12px_32px_rgba(15,23,42,0.14)]',
  '[&_.custom-select-list.open]:block',
  '[&_.custom-select-list_li]:cursor-pointer [&_.custom-select-list_li]:rounded-lg [&_.custom-select-list_li]:px-2.5 [&_.custom-select-list_li]:py-2 [&_.custom-select-list_li]:text-sm [&_.custom-select-list_li]:text-db-ink',
  '[&_.custom-select-list_li.active]:bg-[#fce7f0] [&_.custom-select-list_li.selected]:font-bold [&_.custom-select-list_li.selected]:text-db-pink-deep',
  '[&_.custom-select-list_li.cs-empty]:cursor-default [&_.custom-select-list_li.cs-empty]:bg-transparent [&_.custom-select-list_li.cs-empty]:italic [&_.custom-select-list_li.cs-empty]:text-db-muted',
].join(' ');

function Field({ label, required, hint, error, className = '', children }: {
  label: string; required?: boolean; hint?: React.ReactNode; error?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <label className="mb-1.5 block text-[13px] font-semibold text-db-ink">
        {label}
        {required && <span className="ml-0.5 text-db-pink">*</span>}
      </label>
      {children}
      {error ? (
        <p className="m-0 mt-1.5 text-xs font-medium text-[#b42318]" aria-live="polite">{error}</p>
      ) : hint ? (
        <p className="m-0 mt-1.5 text-xs text-db-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>;
}

function IconInput({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 text-db-muted">{icon}</span>
      <input {...props} className={`${INPUT_BASE} pl-11 pr-4`} />
    </div>
  );
}

// A small, non-typeable code picker ("IN +91 ▾") in its own box, then a digits-only number box.
// The `button.custom-select-btn` variants out-rank SELECT_SKIN's combobox ones (element + class).
const CODE_SKIN = [
  '[&_button.custom-select-btn]:cursor-pointer [&_button.custom-select-btn]:justify-between [&_button.custom-select-btn]:px-3',
  '[&_button.custom-select-btn]:font-[inherit] [&_button.custom-select-btn]:text-[15px] [&_button.custom-select-btn]:font-medium [&_button.custom-select-btn]:text-db-ink',
  '[&_.cs-label]:whitespace-nowrap [&_.custom-select-list]:min-w-[260px] [&_.cs-detail]:ml-1.5 [&_.cs-detail]:text-db-muted',
].join(' ');

function PhoneInput({ code, number, invalid, onChangeCode, onChangeNumber, onBlur }: {
  code: string; number: string; invalid: boolean;
  onChangeCode: (v: string) => void; onChangeNumber: (v: string) => void; onBlur: () => void;
}) {
  const rule = PHONE_RULES[code] || PHONE_RULES.other;
  return (
    <div className="flex gap-2">
      {/* Sized to the code it shows rather than one fixed width for the longest code. */}
      <div
        className={`shrink-0 text-[15px] font-medium ${SELECT_SKIN} ${CODE_SKIN}`}
        style={{ width: `calc(${phoneCodeTextWidth(PHONE_CODE_OPTIONS.find((o) => o.value === code)?.label ?? "")} + 46px)` }}
      >
        <CustomSelect ariaLabel="Country Code" options={PHONE_CODE_OPTIONS} value={code} onChange={onChangeCode} onBlurValidate={onBlur} />
      </div>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label="Phone Number"
        aria-invalid={invalid}
        maxLength={rule.maxLen}
        placeholder="98765 43210"
        value={number}
        // Digits only: letters and symbols never reach the field, typed or pasted.
        onKeyDown={(e) => {
          const isControl = e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey;
          if (!isControl && !/^[0-9]$/.test(e.key)) e.preventDefault();
        }}
        onChange={(e) => onChangeNumber(e.target.value.replace(/\D/g, '').slice(0, rule.maxLen))}
        onBlur={onBlur}
        className={`${invalid ? INPUT_INVALID : INPUT_BASE} min-w-0 flex-1 px-4`}
      />
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="relative">
      <select
        className={`${INPUT_BASE} cursor-pointer appearance-none pl-4 pr-10`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-db-muted" />
    </div>
  );
}

function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-solid px-4 font-[inherit] text-sm font-semibold transition ${
              on ? 'border-db-pink bg-db-pink/10 text-db-pink-deep' : 'border-db-line bg-white text-db-ink hover:border-[#d4cfdc]'
            }`}
          >
            {on && <Check size={14} strokeWidth={3} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-db-muted after:h-px after:flex-1 after:bg-db-line after:content-['']">
      {children}
    </p>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-db-line bg-transparent font-[inherit] text-sm font-semibold text-db-ink transition hover:border-db-pink hover:text-db-pink-deep"
    >
      <Plus size={16} /> {children}
    </button>
  );
}

function RepeaterCard({ onRemove, children }: { onRemove?: () => void; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-dashed border-db-line bg-db-panel p-4 pt-5">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-db-muted transition hover:bg-[#fff1f2] hover:text-[#b42318]"
        >
          <Trash2 size={15} />
        </button>
      )}
      {children}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  s_name: 'Startup Name', s_founded: 'Founded Year', s_entity: 'Legal Entity Type', s_stage: 'Stage',
  s_dpiit: 'DPIIT Registered', s_dpiit_number: 'DPIIT Certificate Number', s_team_size: 'Team Size',
  s_revenue_status: 'Revenue Status', s_pitch: 'One-Line Pitch', s_raising: 'Currently Raising',
  s_amount_seeking: 'Amount Seeking', s_crunchbase: 'Crunchbase Profile', s_tracxn: 'Tracxn Profile',
  i_firm: 'Firm / Fund Name', i_type: 'Investor Type', i_check_size: 'Check Size Range',
  i_stage_focus: 'Stage Focus', i_sector_focus: 'Sector Focus', i_geo_focus: 'Geography Focus',
  a_program_name: 'Program Name', a_duration: 'Program Duration', a_sector_focus: 'Sector Focus',
  a_equity_taken: 'Equity Taken (%)',
  c_platforms: 'Primary Platform(s)', c_niche: 'Content Niche', c_mediakit: 'Media Kit / Portfolio Link',
  l_firm: 'Firm Name', l_practice_areas: 'Practice Areas / Services', l_jurisdiction: 'Jurisdictions Qualified In',
  l_years_experience: 'Years of Experience',
  cs_firm: 'Firm Name', cs_membership_number: 'Membership No.', cs_services: 'Services Offered',
  cs_years_experience: 'Years of Experience',
  ib_firm: 'Firm / Bank Name', ib_years_experience: 'Years of Experience', ib_deal_types: 'Deal Types Handled',
  bk_bank_name: 'Bank Name', bk_years_experience: 'Years of Experience', bk_vertical: 'Banking Vertical',
  g_organization: 'Organization', g_role: 'Role',
};

// Long free-text answers read better across the full width of the review grid.
const WIDE_FIELDS = new Set(['s_pitch', 'i_sector_focus', 'i_geo_focus', 'l_practice_areas', 'cs_services', 'ib_deal_types', 'c_platforms']);

const CHOICE_LABELS: Record<string, string> = { yes: 'Yes', no: 'No', planning: 'Planning Soon' };

// Column prefixes each category's step-4 answers live under. Professionals reuse the former
// Lawyer (l_) and CA / CS (cs_) columns rather than adding new ones.
const CATEGORY_PREFIX: Record<string, string[]> = {
  startup: ['s_'], investor: ['i_'], vcpe: ['i_'], familyoffice: ['i_'],
  accelerator: ['a_'], incubator: ['a_'], creator: ['c_'], media: ['c_'],
  professional: ['l_', 'cs_'], ibanker: ['ib_'],
  govt: ['g_'], consultant: ['g_'], coworking: ['g_'], university: ['g_'], student: ['g_'], other: ['g_'],
};

function ReviewCard({ icon, title, onEdit, children }: { icon: React.ReactNode; title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-solid border-db-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-solid border-db-line bg-db-panel px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-db-pink/10 text-db-pink">{icon}</span>
          <h3 className="m-0 text-[15px] font-bold text-db-ink">{title}</h3>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2.5 font-[inherit] text-[13px] font-semibold text-db-pink-deep transition hover:bg-db-pink/10"
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ReviewItem({ label, value, href, wide }: { label: string; value?: string | number | null; href?: boolean; wide?: boolean }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-db-muted">{label}</p>
      {empty ? (
        <p className="m-0 text-sm font-medium text-[#b5b0bd]">Not added</p>
      ) : href ? (
        <a href={String(value)} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-db-pink-deep no-underline hover:underline">
          {String(value).replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      ) : (
        <p className="m-0 break-words text-sm font-semibold text-db-ink">{value}</p>
      )}
    </div>
  );
}

const STEP_LABELS: Record<number, string> = {
  1: 'Basic Info', 2: 'Sector', 3: 'Category', 4: 'Details', 5: 'Review',
};

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Tell us who you are and how to reach you.',
  2: 'Pick the sectors you want in your briefing.',
  3: 'Which best describes you?',
  4: 'A few specifics so the right people can find you.',
  5: 'Check everything looks right, then save.',
};

const INTEREST_CATEGORIES = ['investor', 'vcpe', 'familyoffice'];
const LIGHT_CATEGORIES = ['accelerator', 'incubator'];
const CREATOR_CATEGORIES = ['creator', 'media'];
const GENERIC_CATEGORIES = ['govt', 'consultant', 'coworking', 'university', 'student', 'other'];

export default function CompleteProfileWizard({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — basic
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState(DEFAULT_PHONE_CODE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');

  // Step 2 — interests (newsletter categories)
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [morningSignalEnabled, setMorningSignalEnabled] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [hadCategoriesAlready, setHadCategoriesAlready] = useState(false);

  // Step 3 — category
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');

  // Step 4 — category-specific
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [founders, setFounders] = useState<Founder[]>([{ name: '', role: '', linkedin_url: '' }]);
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const setP = (key: string, value: string) => setProfile((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    const token = localStorage.getItem('pub_auth_token');
    if (!token) return;

    (async () => {
      try {
        const [statusRes, catRes] = await Promise.all([
          fetch('/api/public-auth/profile-status', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/newsletter/categories', { cache: 'no-store' }),
        ]);
        const statusData = await statusRes.json().catch(() => null);
        const catData = await catRes.json().catch(() => null);

        if (statusData?.success) {
          const u = statusData.data.user;
          setName(u.name || '');
          setEmail(u.email || '');
          const split = splitPhone(u.phone || '');
          // No saved number yet: open on the dial code of the saved country, when there is one.
          setPhoneCode(split.number ? split.code : codeForCountry(u.country || '') || split.code);
          setPhoneNumber(split.number);
          setCountry(u.country || '');
          setCity(u.city || '');
          setLinkedin(u.linkedin_url || '');
          setWebsite(u.website || '');
          setBio(u.bio || '');
          setCategory(u.category || '');
          setOtherCategory(u.other_category || '');
          const p: Record<string, string> = {};
          Object.keys(u).forEach((k) => {
            if (/^(s_|i_|a_|c_|l_|cs_|ib_|bk_|g_)/.test(k) && u[k] != null) p[k] = String(u[k]);
          });
          setProfile(p);
          if (statusData.data.founders?.length) setFounders(statusData.data.founders);
          if (statusData.data.fundingRounds?.length) setFundingRounds(statusData.data.fundingRounds);
          const existingSlugs: string[] = u.newsletter_category_slugs
            ? String(u.newsletter_category_slugs).split(',').filter(Boolean)
            : [];
          setSelectedCats(existingSlugs);
          setHadCategoriesAlready(existingSlugs.length > 0);
        }
        if (catData?.success && catData.data?.length) {
          setNlCategories(catData.data);
          setMorningSignalEnabled(catData.morningSignalEnabled === true);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const showInterestsStep = morningSignalEnabled && nlCategories.length > 0 && !hadCategoriesAlready;

  const steps = useMemo(() => {
    const s = [1];
    if (showInterestsStep) s.push(2);
    s.push(3, 4, 5);
    return s;
  }, [showInterestsStep]);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const isFirst = stepIdx === 0;

  // Name, a valid phone (per its country's digit rule) + country are mandatory; the rest is optional.
  const phoneErr = phoneError(phoneCode, phoneNumber);
  const phone = phoneNumber ? `${phoneCode} ${phoneNumber}` : '';
  const basicValid = Boolean(name.trim() && !phoneErr && country.trim());
  const stepValid = step === 1 ? basicValid : true;

  const next = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));
  const goTo = (s: number) => { const i = steps.indexOf(s); if (i >= 0) setStepIdx(i); };

  const dismiss = () => {
    sessionStorage.setItem('pending_profile_dismissed', '1');
    onClose();
  };

  // Esc closes the form like the × does — unless a dropdown inside it is open, in which case that
  // Esc only closes the dropdown (CustomSelect handles it), and never mid-save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || saving) return;
      if (document.querySelector('.custom-select-list.open')) return;
      dismiss();
    };
    // Capture phase: runs before CustomSelect's own Esc handler closes its list, so the open-list
    // check above still sees it and one Esc never closes both the dropdown and the form.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });

  const saveInterests = async () => {
    if (selectedCats.length === 0) return;
    try {
      const token = localStorage.getItem('pub_auth_token');
      if (token) {
        await fetch('/api/public-auth/newsletter-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ categories: selectedCats }),
        });
      }
    } catch { /* best-effort */ }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('pub_auth_token');
      if (!token) throw new Error('no-token');

      const numericKeys = ['s_founded', 'l_years_experience', 'cs_years_experience', 'ib_years_experience', 'bk_years_experience', 'a_equity_taken'];
      const cleanedProfile: Record<string, string | number | null> = {};
      Object.entries(profile).forEach(([k, v]) => {
        if (!v) return;
        cleanedProfile[k] = numericKeys.includes(k) ? Number(v) : v;
      });

      const res = await fetch('/api/public-auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone || null,
          country: country || null,
          city: city || null,
          linkedin_url: linkedin || null,
          website: website || null,
          bio: bio || null,
          category: category || null,
          otherCategory: category === 'other' ? otherCategory || null : null,
          profile: cleanedProfile,
          founders: category === 'startup' ? founders.filter((f) => f.name.trim()) : undefined,
          fundingRounds: category === 'startup' ? fundingRounds : undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) {
        setError(d.error || 'Failed to save. Please try again.');
        return;
      }

      const raw = localStorage.getItem('pub_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const updated = { ...u, ...(name.trim() ? { name: name.trim() } : {}), phone, country, city, linkedin_url: linkedin };
        localStorage.setItem('pub_auth_user', JSON.stringify(updated));
        window.dispatchEvent(new Event('pub-auth-changed'));
      }
      onComplete();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;

  const categoryInfo = REGISTRATION_CATEGORIES.find((c) => c.value === category);
  const categoryLabel = category === 'other' && otherCategory ? otherCategory : categoryInfo?.label || '';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const location = [city, country].filter(Boolean).join(', ');
  const detailEntries = category && CATEGORY_PREFIX[category]
    // Organization / Role (g_*) are asked on Basic info for everyone, so they're reviewed there.
    ? Object.entries(profile).filter(([k, val]) => CATEGORY_PREFIX[category].some((pre) => k.startsWith(pre)) && !k.startsWith('g_') && val)
    : [];
  const filledFounders = founders.filter((f) => f.name.trim());

  return (
    <div className="fixed inset-0 z-[2000] flex animate-cpw-fade items-end justify-center bg-[rgba(15,23,42,0.6)] p-0 backdrop-blur-[6px] sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-[680px] animate-cpw-modal flex-col overflow-hidden rounded-t-3xl bg-white font-db-nav shadow-[0_30px_70px_rgba(15,23,42,0.3),0_4px_12px_rgba(15,23,42,0.08)] sm:max-h-[90vh] sm:rounded-3xl">
        {/* Header */}
        <div className="shrink-0 border-b border-solid border-db-line px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="m-0 text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-db-ink sm:text-[26px]">Complete your profile</h2>
              <p className="m-0 mt-1.5 text-sm leading-snug text-db-muted">
                <span className="font-semibold text-db-ink">Step {stepIdx + 1} of {steps.length}</span> · {STEP_SUBTITLES[step]}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Skip"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-db-bg text-db-ink transition hover:bg-db-line"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          <ol className="m-0 mt-5 flex list-none items-center p-0">
            {steps.map((s, i) => (
              <Fragment key={s}>
                <li className="flex shrink-0">
                  {i === stepIdx ? (
                    <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full bg-db-ink py-1 pl-1 pr-3.5 text-[13px] font-bold text-white">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-extrabold text-db-ink">{i + 1}</span>
                      {STEP_LABELS[s]}
                    </span>
                  ) : i < stepIdx ? (
                    <button
                      type="button"
                      onClick={() => setStepIdx(i)}
                      title={STEP_LABELS[s]}
                      aria-label={`Back to ${STEP_LABELS[s]}`}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-db-pink text-white transition hover:bg-db-pink-deep"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                  ) : (
                    <span title={STEP_LABELS[s]} className="flex h-7 w-7 items-center justify-center rounded-full border border-solid border-db-line bg-white text-xs font-bold text-db-muted">
                      {i + 1}
                    </span>
                  )}
                </li>
                {i < steps.length - 1 && (
                  <li aria-hidden="true" className={`mx-2 h-0.5 min-w-3 flex-1 rounded-full ${i < stepIdx ? 'bg-db-pink' : 'bg-db-line'}`} />
                )}
              </Fragment>
            ))}
          </ol>
        </div>

        {/* Body */}
        <div key={step} className="min-h-0 flex-1 animate-cpw-step overflow-y-auto px-5 py-6 [scrollbar-width:thin] sm:px-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-solid border-[#fecdd3] bg-[#fff1f2] px-3.5 py-3 text-[13px] font-medium text-[#b42318]">
              <AlertCircle size={16} className="mt-px shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-7">
              <section>
                <SectionTitle>Personal Details</SectionTitle>
                <div className="flex flex-col gap-5">
                  <Field label="Full Name" required>
                    <IconInput icon={<User size={17} />} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
                  </Field>
                  <Row2>
                    <Field label="Email">
                      <div className="relative">
                        <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-db-muted" />
                        <input
                          value={email}
                          readOnly
                          tabIndex={-1}
                          title="Your sign-in email can't be changed here"
                          className={INPUT_READONLY}
                        />
                        <Lock size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#b5b0bd]" />
                      </div>
                    </Field>
                    <Field label="Phone / WhatsApp" required error={phoneTouched ? phoneErr : ''}>
                      <PhoneInput
                        code={phoneCode}
                        number={phoneNumber}
                        invalid={phoneTouched && !!phoneErr}
                        onChangeCode={setPhoneCode}
                        onChangeNumber={setPhoneNumber}
                        onBlur={() => setPhoneTouched(true)}
                      />
                    </Field>
                  </Row2>
                </div>
              </section>

              <section>
                <SectionTitle>Work</SectionTitle>
                <Row2>
                  <Field label="Organization">
                    <IconInput icon={<Building2 size={17} />} value={profile.g_organization || ''} onChange={(e) => setP('g_organization', e.target.value)} placeholder="e.g. Acme Labs" />
                  </Field>
                  <Field label="Role">
                    <IconInput icon={<Briefcase size={17} />} value={profile.g_role || ''} onChange={(e) => setP('g_role', e.target.value)} placeholder="e.g. Co-Founder & CEO" />
                  </Field>
                </Row2>
              </section>

              <section>
                <SectionTitle>Location</SectionTitle>
                <Row2>
                  <Field label="Country" required>
                    <div className={SELECT_SKIN}>
                      <CustomSelect
                        ariaLabel="Country"
                        searchable
                        placeholder="Select country"
                        options={COUNTRY_OPTIONS}
                        value={country}
                        onChange={(c) => {
                          setCountry(c);
                          // Nothing typed yet: follow the country with its dial code.
                          if (!phoneNumber) setPhoneCode(codeForCountry(c) || phoneCode);
                        }}
                      />
                    </div>
                  </Field>
                  <Field label="City">
                    <IconInput icon={<MapPin size={17} />} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
                  </Field>
                </Row2>
              </section>

              <section>
                <SectionTitle>Online Presence</SectionTitle>
                <div className="flex flex-col gap-5">
                  <Row2>
                    <Field label="LinkedIn Profile">
                      <IconInput icon={<RiLinkedinBoxFill size={17} />} type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" />
                    </Field>
                    <Field label="Website">
                      <IconInput icon={<Globe size={17} />} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                    </Field>
                  </Row2>
                  <Field
                    label="Short Bio"
                    hint={<span className="flex justify-between"><span>A couple of sentences about you.</span><span>{bio.length}/300</span></span>}
                  >
                    <textarea
                      className={TEXTAREA}
                      value={bio}
                      maxLength={300}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="What you do, what you're building, what you're looking for"
                    />
                  </Field>
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <>
              <p className="m-0 mb-5 flex flex-wrap items-center gap-2 text-[15px] text-db-muted">
                Choose <strong className="text-db-ink">1–3 sectors</strong> to personalise your StartupNews briefing.
                <span className="text-[13px] font-bold text-db-pink">{selectedCats.length}/3 selected</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {[...nlCategories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => {
                  const isSelected = selectedCats.includes(cat.slug);
                  const maxReached = selectedCats.length >= 3 && !isSelected;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      disabled={maxReached}
                      onClick={() => setSelectedCats((prev) => isSelected ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug])}
                      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-solid px-4 py-2 font-[inherit] text-[13px] transition ${
                        isSelected ? 'cursor-pointer font-bold'
                          : maxReached ? 'cursor-not-allowed border-db-line bg-db-bg font-medium text-db-ink opacity-50'
                          : 'cursor-pointer border-db-line bg-white font-medium text-db-ink hover:-translate-y-px hover:border-[#d4cfdc]'
                      }`}
                      // Sector colours come from the CMS, so they can only be applied at runtime.
                      style={isSelected ? { borderColor: cat.color, background: cat.color + '18', color: cat.color } : undefined}
                    >
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: isSelected ? cat.color : '#cbd5e1' }} />
                      {cat.name}
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {REGISTRATION_CATEGORIES.map((c) => {
                const on = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`relative cursor-pointer rounded-2xl border-[1.5px] border-solid px-2.5 pb-3.5 pt-4 text-center font-[inherit] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] ${
                      on ? 'border-db-pink bg-[#fde8f0] shadow-[0_4px_14px_rgba(238,23,97,0.15)]' : 'border-db-line bg-db-panel hover:border-[#f2b8cc]'
                    }`}
                  >
                    {on && (
                      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-db-pink text-white">
                        <Check size={10} strokeWidth={3.5} />
                      </span>
                    )}
                    <span className="mb-1.5 block text-[22px]">{c.icon}</span>
                    <span className="block text-xs font-semibold text-db-ink">{c.label}</span>
                  </button>
                );
              })}
              {category === 'other' && (
                <div className="col-span-full mt-2">
                  <Field label="Please Specify">
                    <input className={INPUT} value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <CategoryDetailFields
              category={category}
              profile={profile}
              setP={setP}
              founders={founders}
              setFounders={setFounders}
              fundingRounds={fundingRounds}
              setFundingRounds={setFundingRounds}
            />
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              {/* Profile summary */}
              <div className="rounded-2xl border border-solid border-[#f6d3e0] bg-gradient-to-br from-[#fff4f8] via-white to-white p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-db-pink to-db-pink-deep text-lg font-extrabold text-white shadow-[0_6px_16px_rgba(236,23,96,0.3)]">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="m-0 truncate text-lg font-extrabold text-db-ink">{name || 'Your name'}</p>
                      {categoryLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-db-ink px-2.5 py-0.5 text-[11px] font-bold text-white">
                          {categoryInfo?.icon} {categoryLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-db-muted">
                      {location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{location}</span>}
                      {email && <span className="inline-flex min-w-0 items-center gap-1.5"><Mail size={14} className="shrink-0" /><span className="truncate">{email}</span></span>}
                      {phone && <span className="inline-flex items-center gap-1.5"><Phone size={14} />{phone}</span>}
                    </div>
                  </div>
                </div>
                {bio && <p className="m-0 mt-4 border-t border-solid border-[#f6d3e0] pt-4 text-sm leading-relaxed text-db-ink">{bio}</p>}
              </div>

              <ReviewCard icon={<User size={16} />} title="Basic Details" onEdit={() => goTo(1)}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <ReviewItem label="Full Name" value={name} />
                  <ReviewItem label="Email" value={email} />
                  <ReviewItem label="Phone / WhatsApp" value={phone} />
                  <ReviewItem label="Organization" value={profile.g_organization} />
                  <ReviewItem label="Role" value={profile.g_role} />
                  <ReviewItem label="Country" value={country} />
                  <ReviewItem label="City" value={city} />
                  <ReviewItem label="LinkedIn" value={linkedin} href />
                  <ReviewItem label="Website" value={website} href />
                </div>
              </ReviewCard>

              {selectedCats.length > 0 && (
                <ReviewCard icon={<Sparkles size={16} />} title="Sectors" onEdit={steps.includes(2) ? () => goTo(2) : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {selectedCats.map((slug) => {
                      const cat = nlCategories.find((c) => c.slug === slug);
                      const color = cat?.color || BRAND;
                      return (
                        <span key={slug} className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: color + '18', color }}>
                          {cat?.name || slug}
                        </span>
                      );
                    })}
                  </div>
                </ReviewCard>
              )}

              <ReviewCard icon={<Briefcase size={16} />} title="Category & Details" onEdit={() => goTo(category ? 4 : 3)}>
                {category ? (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <ReviewItem label="Category" value={categoryInfo?.label || category} />
                    {category === 'other' && <ReviewItem label="Specified As" value={otherCategory} />}
                    {detailEntries.map(([k, val]) => (
                      <ReviewItem
                        key={k}
                        label={FIELD_LABELS[k] || k}
                        value={CHOICE_LABELS[val] && ['s_dpiit', 's_raising'].includes(k) ? CHOICE_LABELS[val] : val}
                        href={/crunchbase|tracxn|mediakit/.test(k)}
                        wide={WIDE_FIELDS.has(k)}
                      />
                    ))}
                    {detailEntries.length === 0 && (
                      <p className="m-0 text-sm text-db-muted sm:col-span-2">No extra details added yet — you can add them any time.</p>
                    )}
                  </div>
                ) : (
                  <p className="m-0 text-sm text-db-muted">No category picked yet.</p>
                )}
              </ReviewCard>

              {category === 'startup' && filledFounders.length > 0 && (
                <ReviewCard icon={<Users size={16} />} title="Founders" onEdit={() => goTo(4)}>
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {filledFounders.map((f, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-db-bg text-xs font-bold text-db-ink">
                          {f.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-sm font-semibold text-db-ink">{f.name}</p>
                          {f.role && <p className="m-0 truncate text-xs text-db-muted">{f.role}</p>}
                        </div>
                        {f.linkedin_url && (
                          <a href={f.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`${f.name} on LinkedIn`} className="flex text-[#0a66c2]">
                            <RiLinkedinBoxFill size={20} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </ReviewCard>
              )}

              {category === 'startup' && fundingRounds.length > 0 && (
                <ReviewCard icon={<TrendingUp size={16} />} title="Funding History" onEdit={() => goTo(4)}>
                  <ul className="m-0 flex list-none flex-col divide-y divide-db-line p-0">
                    {fundingRounds.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-semibold text-db-ink">{r.round_type || 'Round'}</p>
                          <p className="m-0 truncate text-xs text-db-muted">
                            {[r.lead_investor, r.round_date].filter(Boolean).join(' · ') || 'No investor or date added'}
                          </p>
                        </div>
                        {r.amount && <span className="shrink-0 rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-bold text-[#067647]">{r.amount}</span>}
                      </li>
                    ))}
                  </ul>
                </ReviewCard>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-solid border-db-line bg-white px-5 pb-5 pt-4 sm:px-8 sm:pb-6">
          {!isLast && !stepValid && (
            <p className="m-0 mb-3 text-[13px] font-medium text-[#c2410c]">Fill in all required fields (*) to continue.</p>
          )}
          {isLast && !basicValid && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-solid border-[#fed7aa] bg-[#fff7ed] px-3.5 py-3 text-[13px] font-medium text-[#c2410c]">
              <AlertCircle size={16} className="mt-px shrink-0" />
              Full Name, a valid Phone / WhatsApp number and Country are required. Go back to Basic Info and fill them in before saving.
            </div>
          )}
          <div className="flex gap-3">
            {!isFirst && (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-solid border-db-line bg-white px-5 font-[inherit] text-[15px] font-semibold text-db-ink transition hover:border-[#d4cfdc] hover:bg-db-bg"
              >
                <ArrowLeft size={17} /> Back
              </button>
            )}
            <button
              type="button"
              disabled={isLast ? saving || !basicValid : !stepValid}
              onClick={isLast ? handleSubmit : async () => { if (step === 2) await saveInterests(); next(); }}
              className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-db-pink-deep px-6 font-[inherit] text-[15px] font-bold text-white transition hover:bg-db-pink active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#f3b5c9] disabled:active:scale-100"
            >
              {isLast ? (
                <>{saving ? 'Saving…' : 'Save & finish'}{!saving && <Check size={18} strokeWidth={2.6} />}</>
              ) : (
                <>Continue <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryDetailFields({
  category, profile, setP, founders, setFounders, fundingRounds, setFundingRounds,
}: {
  category: string;
  profile: Record<string, string>;
  setP: (key: string, value: string) => void;
  founders: Founder[];
  setFounders: (f: Founder[] | ((prev: Founder[]) => Founder[])) => void;
  fundingRounds: FundingRound[];
  setFundingRounds: (r: FundingRound[] | ((prev: FundingRound[]) => FundingRound[])) => void;
}) {
  const v = (key: string) => profile[key] || '';
  const text = (key: string, placeholder?: string, type = 'text') => (
    <input type={type} className={INPUT} placeholder={placeholder} value={v(key)} onChange={(e) => setP(key, e.target.value)} />
  );
  const select = (key: string, options: readonly string[]) => (
    <Select value={v(key)} onChange={(val) => setP(key, val)} options={options} />
  );

  if (!category) return <p className="m-0 text-sm text-db-muted">Pick a category first.</p>;

  if (category === 'startup') {
    const setFounder = (i: number, patch: Partial<Founder>) => setFounders((prev) => prev.map((x, idx) => idx === i ? { ...x, ...patch } : x));
    const setRound = (i: number, patch: Partial<FundingRound>) => setFundingRounds((prev) => prev.map((x, idx) => idx === i ? { ...x, ...patch } : x));
    return (
      <div className="flex flex-col gap-7">
        <section>
          <SectionTitle>Company</SectionTitle>
          <div className="flex flex-col gap-5">
            <Row2>
              <Field label="Startup Name">{text('s_name')}</Field>
              <Field label="Founded Year">
                <input type="number" className={INPUT} value={v('s_founded')} onChange={(e) => setP('s_founded', e.target.value)} min={1990} max={2026} />
              </Field>
            </Row2>
            <Row2>
              <Field label="Legal Entity Type">{select('s_entity', ENTITY_TYPES)}</Field>
              <Field label="Stage">{select('s_stage', STARTUP_STAGES)}</Field>
            </Row2>
            <Row2>
              <Field label="Team Size">{select('s_team_size', TEAM_SIZES)}</Field>
              <Field label="Revenue Status">{select('s_revenue_status', REVENUE_STATUSES)}</Field>
            </Row2>
            <Field label="One-Line Pitch">
              <input className={INPUT} maxLength={140} value={v('s_pitch')} onChange={(e) => setP('s_pitch', e.target.value)} />
            </Field>
            <Field label="DPIIT Registered?">
              <Choice value={v('s_dpiit')} onChange={(val) => setP('s_dpiit', val)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
              {v('s_dpiit') === 'yes' && <div className="mt-3">{text('s_dpiit_number', 'DPIIT certificate number')}</div>}
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle>Founders</SectionTitle>
          <div className="flex flex-col gap-3">
            {founders.map((f, i) => (
              <RepeaterCard key={i} onRemove={founders.length > 1 ? () => setFounders((prev) => prev.filter((_, idx) => idx !== i)) : undefined}>
                <Row2>
                  <Field label="Founder Name"><input className={INPUT} value={f.name} onChange={(e) => setFounder(i, { name: e.target.value })} /></Field>
                  <Field label="Role"><input className={INPUT} value={f.role} onChange={(e) => setFounder(i, { role: e.target.value })} /></Field>
                </Row2>
                <Field label="LinkedIn">
                  <IconInput icon={<RiLinkedinBoxFill size={17} />} type="url" value={f.linkedin_url} onChange={(e) => setFounder(i, { linkedin_url: e.target.value })} />
                </Field>
              </RepeaterCard>
            ))}
            <AddButton onClick={() => setFounders((prev) => [...prev, { name: '', role: '', linkedin_url: '' }])}>Add founder</AddButton>
          </div>
        </section>

        <section>
          <SectionTitle>Funding</SectionTitle>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              {fundingRounds.map((r, i) => (
                <RepeaterCard key={i} onRemove={() => setFundingRounds((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Row2>
                    <Field label="Round Type"><Select value={r.round_type} onChange={(val) => setRound(i, { round_type: val })} options={ROUND_TYPES} /></Field>
                    <Field label="Amount"><input className={INPUT} placeholder="e.g. $500K" value={r.amount} onChange={(e) => setRound(i, { amount: e.target.value })} /></Field>
                  </Row2>
                  <Row2>
                    <Field label="Lead Investor(s)"><input className={INPUT} value={r.lead_investor} onChange={(e) => setRound(i, { lead_investor: e.target.value })} /></Field>
                    <Field label="Date"><input type="month" className={INPUT} value={r.round_date} onChange={(e) => setRound(i, { round_date: e.target.value })} /></Field>
                  </Row2>
                </RepeaterCard>
              ))}
              <AddButton onClick={() => setFundingRounds((prev) => [...prev, { round_type: '', amount: '', lead_investor: '', round_date: '' }])}>Add funding round</AddButton>
            </div>
            <Field label="Currently Raising?">
              <Choice
                value={v('s_raising')}
                onChange={(val) => setP('s_raising', val)}
                options={[{ value: 'yes', label: 'Yes' }, { value: 'planning', label: 'Planning Soon' }, { value: 'no', label: 'No' }]}
              />
            </Field>
            {v('s_raising') && v('s_raising') !== 'no' && (
              <Field label="Amount Seeking">{text('s_amount_seeking', 'e.g. $500K')}</Field>
            )}
            <Row2>
              <Field label="Crunchbase Profile">{text('s_crunchbase', 'https://', 'url')}</Field>
              <Field label="Tracxn Profile">{text('s_tracxn', 'https://', 'url')}</Field>
            </Row2>
          </div>
        </section>
      </div>
    );
  }

  if (INTEREST_CATEGORIES.includes(category)) {
    return (
      <div className="flex flex-col gap-5">
        <Row2>
          <Field label="Firm / Fund Name">{text('i_firm')}</Field>
          <Field label="Investor Type">{select('i_type', INVESTOR_TYPES)}</Field>
        </Row2>
        <Row2>
          <Field label="Check Size Range">{select('i_check_size', CHECK_SIZES)}</Field>
          <Field label="Stage Focus">{select('i_stage_focus', STAGE_FOCUS)}</Field>
        </Row2>
        <Row2>
          <Field label="Sector Focus">{text('i_sector_focus', 'e.g. Fintech, SaaS')}</Field>
          <Field label="Geography Focus">{text('i_geo_focus', 'e.g. India, SEA')}</Field>
        </Row2>
      </div>
    );
  }

  if (LIGHT_CATEGORIES.includes(category)) {
    return (
      <div className="flex flex-col gap-5">
        <Row2>
          <Field label="Program Name">{text('a_program_name')}</Field>
          <Field label="Program Duration">{text('a_duration', 'e.g. 12 weeks')}</Field>
        </Row2>
        <Row2>
          <Field label="Sector Focus">{text('a_sector_focus')}</Field>
          <Field label="Equity Taken (%)">{text('a_equity_taken', undefined, 'number')}</Field>
        </Row2>
      </div>
    );
  }

  if (CREATOR_CATEGORIES.includes(category)) {
    return (
      <div className="flex flex-col gap-5">
        <Field label="Primary Platform(s)">{text('c_platforms', 'e.g. Instagram, YouTube, LinkedIn')}</Field>
        <Row2>
          <Field label="Content Niche">{text('c_niche')}</Field>
          <Field label="Media Kit / Portfolio Link">{text('c_mediakit', 'https://', 'url')}</Field>
        </Row2>
      </div>
    );
  }

  if (category === 'professional') {
    return (
      <div className="flex flex-col gap-5">
        <Row2>
          <Field label="Firm Name (or Independent)">{text('l_firm')}</Field>
          <Field label="Membership No." hint="Bar Council, ICAI or ICSI number">{text('cs_membership_number')}</Field>
        </Row2>
        <Field label="Practice Areas / Services">{text('l_practice_areas', 'e.g. Corporate law, VC fundraising, Audit, ROC filings')}</Field>
        <Row2>
          <Field label="Jurisdictions Qualified In">{text('l_jurisdiction', 'e.g. India, Singapore')}</Field>
          <Field label="Years of Experience">{text('l_years_experience', undefined, 'number')}</Field>
        </Row2>
      </div>
    );
  }

  if (category === 'ibanker') {
    return (
      <div className="flex flex-col gap-5">
        <Row2>
          <Field label="Firm / Bank Name">{text('ib_firm')}</Field>
          <Field label="Years of Experience">{text('ib_years_experience', undefined, 'number')}</Field>
        </Row2>
        <Field label="Deal Types Handled">{text('ib_deal_types', 'e.g. M&A, IPO, PE/VC Fundraising')}</Field>
      </div>
    );
  }

  // Organization and Role now sit on Basic info for every user, so these categories need nothing more.
  if (GENERIC_CATEGORIES.includes(category)) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-solid border-db-line bg-db-panel p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-db-pink/10 text-db-pink"><Check size={18} strokeWidth={2.6} /></span>
        <div>
          <p className="m-0 text-[15px] font-bold text-db-ink">No Extra Details Needed</p>
          <p className="m-0 mt-1 text-sm text-db-muted">Your Organization and Role from Basic Info cover this category. Continue to review your profile.</p>
        </div>
      </div>
    );
  }

  return null;
}
