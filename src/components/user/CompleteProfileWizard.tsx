'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { COUNTRIES } from '@/constants/countries';
import {
  REGISTRATION_CATEGORIES, INVESTOR_TYPES, CHECK_SIZES, STAGE_FOCUS, ENTITY_TYPES,
  STARTUP_STAGES, TEAM_SIZES, REVENUE_STATUSES, ROUND_TYPES, BANKING_VERTICALS,
} from '@/constants/registrationCategories';

interface NLCategory { id: number; name: string; slug: string; color: string; }
interface Founder { name: string; role: string; linkedin_url: string; }
interface FundingRound { round_type: string; amount: string; lead_investor: string; round_date: string; }

const BRAND = '#ee1761';
const BRAND_DARK = '#c8114d';

const reqMark = <span className="cpw-req">*</span>;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="cpw-field">
      <label className="cpw-label">{label}{required && reqMark}</label>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="cpw-row2">{children}</div>;
}

const FIELD_LABELS: Record<string, string> = {
  s_name: 'Startup name', s_founded: 'Founded year', s_entity: 'Legal entity type', s_stage: 'Stage',
  s_dpiit: 'DPIIT registered', s_dpiit_number: 'DPIIT certificate number', s_team_size: 'Team size',
  s_revenue_status: 'Revenue status', s_pitch: 'One-line pitch', s_raising: 'Currently raising',
  s_amount_seeking: 'Amount seeking', s_crunchbase: 'Crunchbase profile', s_tracxn: 'Tracxn profile',
  i_firm: 'Firm / fund name', i_type: 'Investor type', i_check_size: 'Check size range',
  i_stage_focus: 'Stage focus', i_sector_focus: 'Sector focus', i_geo_focus: 'Geography focus',
  a_program_name: 'Program name', a_duration: 'Program duration', a_sector_focus: 'Sector focus',
  a_equity_taken: 'Equity taken (%)',
  c_platforms: 'Primary platform(s)', c_niche: 'Content niche', c_mediakit: 'Media kit / portfolio link',
  l_firm: 'Firm name', l_practice_areas: 'Practice areas', l_jurisdiction: 'Jurisdictions qualified in',
  l_years_experience: 'Years of experience',
  cs_firm: 'Firm name', cs_membership_number: 'ICAI / ICSI membership no.', cs_services: 'Services offered',
  cs_years_experience: 'Years of experience',
  ib_firm: 'Firm / bank name', ib_years_experience: 'Years of experience', ib_deal_types: 'Deal types handled',
  bk_bank_name: 'Bank name', bk_years_experience: 'Years of experience', bk_vertical: 'Banking vertical',
  g_organization: 'Organization / affiliation', g_role: 'Role / area of focus',
};

const CATEGORY_PREFIX: Record<string, string> = {
  startup: 's_', investor: 'i_', vc: 'i_', pe: 'i_', familyoffice: 'i_',
  accelerator: 'a_', incubator: 'a_', creator: 'c_', media: 'c_',
  lawyer: 'l_', cacs: 'cs_', ibanker: 'ib_', banker: 'bk_',
  govt: 'g_', consultant: 'g_', coworking: 'g_', university: 'g_', student: 'g_', other: 'g_',
};

const STARTUP_REQUIRED_KEYS = ['s_name', 's_founded', 's_entity', 's_stage', 's_team_size', 's_revenue_status', 's_pitch'];

const CATEGORY_REQUIRED_KEYS: Record<string, string[]> = {
  investor: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  vc: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  pe: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  familyoffice: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  accelerator: ['a_program_name', 'a_duration', 'a_sector_focus'],
  incubator: ['a_program_name', 'a_duration', 'a_sector_focus'],
  creator: ['c_platforms', 'c_niche'],
  media: ['c_platforms', 'c_niche'],
  lawyer: ['l_firm', 'l_practice_areas', 'l_jurisdiction', 'l_years_experience'],
  cacs: ['cs_firm', 'cs_membership_number', 'cs_services', 'cs_years_experience'],
  ibanker: ['ib_firm', 'ib_years_experience', 'ib_deal_types'],
  banker: ['bk_bank_name', 'bk_years_experience', 'bk_vertical'],
  govt: ['g_role'], consultant: ['g_role'], coworking: ['g_role'],
  university: ['g_role'], student: ['g_role'], other: ['g_role'],
};

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 14px' }}>
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid #eef2f7', fontSize: '0.8125rem' }}>
      <span style={{ color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const STEP_LABELS: Record<number, string> = {
  1: 'Basic info', 2: 'Sector', 3: 'Category', 4: 'Details', 5: 'Review',
};

const INTEREST_CATEGORIES = ['investor', 'vc', 'pe', 'familyoffice'];
const LIGHT_CATEGORIES = ['accelerator', 'incubator'];
const CREATOR_CATEGORIES = ['creator', 'media'];
const GENERIC_CATEGORIES = ['govt', 'consultant', 'coworking', 'university', 'student', 'other'];

export default function CompleteProfileWizard({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — basic
  const [phone, setPhone] = useState('');
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
          setPhone(u.phone || '');
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

  const basicValid = Boolean(phone.trim() && city.trim() && country.trim() && linkedin.trim());
  const categoryValid = Boolean(category && (category !== 'other' || otherCategory.trim()));
  const categoryDetailsValid = (() => {
    if (!category) return false;
    if (category === 'startup') {
      return (
        STARTUP_REQUIRED_KEYS.every((k) => profile[k]) &&
        Boolean(profile.s_raising) &&
        founders.some((f) => f.name.trim()) &&
        Boolean(website.trim())
      );
    }
    return (CATEGORY_REQUIRED_KEYS[category] || []).every((k) => profile[k]);
  })();

  const stepValid =
    step === 1 ? basicValid :
    step === 3 ? categoryValid :
    step === 4 ? categoryDetailsValid :
    true;

  const allValid = basicValid && categoryValid && categoryDetailsValid;

  const next = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  const dismiss = () => {
    sessionStorage.setItem('pending_profile_dismissed', '1');
    onClose();
  };

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
        const updated = { ...u, phone, country, city, linkedin_url: linkedin };
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

  return (
    <div className="cpw-overlay">
      <div className="cpw-modal">
        <div className="cpw-header">
          <div className="cpw-header-top">
            <h2 className="cpw-title">Complete your profile</h2>
            <button type="button" onClick={dismiss} className="cpw-close" aria-label="Skip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="cpw-steps">
            {steps.map((s, i) => (
              <Fragment key={i}>
                {i === stepIdx ? (
                  <div className="cpw-step-pill">
                    <span className="cpw-step-num">{i + 1}</span>
                    {STEP_LABELS[s]}
                  </div>
                ) : (
                  <span className={`cpw-step-dot ${i < stepIdx ? 'is-done' : ''}`} />
                )}
                {i < steps.length - 1 && <span className="cpw-step-line" />}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="cpw-body" key={step}>
          {error && (
            <div className="cpw-alert cpw-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <Field label="Phone / WhatsApp" required>
                <input className="cpw-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </Field>
              <Row2>
                <Field label="City" required>
                  <input className="cpw-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
                </Field>
                <Field label="Country" required>
                  <select className="cpw-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">Select…</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </Row2>
              <Field label="LinkedIn profile URL" required>
                <input type="url" className="cpw-input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </Field>
              <Field label={`Website${category === 'startup' ? '' : ' (optional, mandatory for startups)'}`} required={category === 'startup'}>
                <input type="url" className="cpw-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </Field>
              <Field label="Short bio (optional)">
                <textarea
                  className="cpw-input cpw-textarea"
                  value={bio}
                  maxLength={300}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A couple of sentences about you"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <p className="cpw-intro">
                Choose <strong>1–3 sectors</strong> to personalise your StartupNews briefing.
                <span className="cpw-intro-count">{selectedCats.length}/3 selected</span>
              </p>
              <div className="cpw-chip-row">
                {[...nlCategories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => {
                  const isSelected = selectedCats.includes(cat.slug);
                  const maxReached = selectedCats.length >= 3 && !isSelected;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      disabled={maxReached}
                      onClick={() => setSelectedCats((prev) => isSelected ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug])}
                      className={`cpw-chip ${isSelected ? 'is-selected' : ''} ${maxReached ? 'is-disabled' : ''}`}
                      style={isSelected ? { borderColor: cat.color, background: cat.color + '18', color: cat.color } : undefined}
                    >
                      <span className="cpw-chip-dot" style={{ background: isSelected ? cat.color : '#cbd5e1' }} />
                      {cat.name}
                      {isSelected && <span className="cpw-chip-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="cpw-cat-grid">
              {REGISTRATION_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`cpw-cat-card ${category === c.value ? 'is-selected' : ''}`}
                >
                  {category === c.value && <span className="cpw-cat-check">✓</span>}
                  <span className="cpw-cat-icon">{c.icon}</span>
                  <span className="cpw-cat-label">{c.label}</span>
                </button>
              ))}
              {category === 'other' && (
                <div className="cpw-cat-other">
                  <Field label="Please specify" required>
                    <input className="cpw-input" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} />
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
            <div>
              <p className="cpw-intro">
                Check everything looks right, then save your profile.
              </p>

              <ReviewSection title="Basic details">
                <ReviewRow label="Phone" value={phone} />
                <ReviewRow label="City" value={city} />
                <ReviewRow label="Country" value={country} />
                <ReviewRow label="LinkedIn" value={linkedin} />
                <ReviewRow label="Website" value={website} />
                <ReviewRow label="Bio" value={bio} />
              </ReviewSection>

              {selectedCats.length > 0 && (
                <ReviewSection title="Sector">
                  <div className="cpw-review-chips">
                    {selectedCats.map((slug) => {
                      const cat = nlCategories.find((c) => c.slug === slug);
                      return (
                        <span key={slug} className="cpw-review-chip" style={{ background: (cat?.color || BRAND) + '18', color: cat?.color || BRAND }}>
                          {cat?.name || slug}
                        </span>
                      );
                    })}
                  </div>
                </ReviewSection>
              )}

              <ReviewSection title="Category">
                <ReviewRow label="You are a" value={REGISTRATION_CATEGORIES.find((c) => c.value === category)?.label || category} />
                {category === 'other' && <ReviewRow label="Specify" value={otherCategory} />}
              </ReviewSection>

              {category && CATEGORY_PREFIX[category] && (
                <ReviewSection title="Details">
                  {Object.entries(profile)
                    .filter(([k, val]) => k.startsWith(CATEGORY_PREFIX[category]) && val)
                    .map(([k, val]) => <ReviewRow key={k} label={FIELD_LABELS[k] || k} value={val} />)}
                </ReviewSection>
              )}

              {category === 'startup' && founders.some((f) => f.name.trim()) && (
                <ReviewSection title="Founders">
                  {founders.filter((f) => f.name.trim()).map((f, i) => (
                    <div key={i} className="cpw-review-list-item">
                      <span className="cpw-review-list-name">{f.name}</span>
                      {f.role && <span className="cpw-review-list-sub"> &middot; {f.role}</span>}
                    </div>
                  ))}
                </ReviewSection>
              )}

              {category === 'startup' && fundingRounds.length > 0 && (
                <ReviewSection title="Funding history">
                  {fundingRounds.map((r, i) => (
                    <div key={i} className="cpw-review-list-item">
                      <span className="cpw-review-list-name">{r.round_type || 'Round'}</span>
                      {r.amount && <span className="cpw-review-list-sub"> &middot; {r.amount}</span>}
                      {r.lead_investor && <span className="cpw-review-list-sub"> &middot; {r.lead_investor}</span>}
                    </div>
                  ))}
                </ReviewSection>
              )}
            </div>
          )}
        </div>

        {isLast && !allValid && (
          <div className="cpw-warning-wrap">
            <div className="cpw-alert cpw-alert-warn">
              Some required fields are still missing — go back and fill them in before saving.
            </div>
          </div>
        )}
        {!isLast && !stepValid && (
          <div className="cpw-warning-wrap">
            <p className="cpw-warning-text">
              Fill in all required fields (*) to continue.
            </p>
          </div>
        )}

        <div className="cpw-footer">
          {!isFirst && (
            <button type="button" onClick={back} className="cpw-btn-back" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !allValid}
              className="cpw-btn-primary"
            >
              {saving ? 'Saving…' : 'Save & finish'}
              {!saving && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
            </button>
          ) : (
            <button
              type="button"
              disabled={!stepValid}
              onClick={async () => { if (step === 2) await saveInterests(); next(); }}
              className="cpw-btn-primary"
            >
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          )}
        </div>
      </div>

      <style>{`
        .cpw-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px); padding: 16px; animation: cpwFadeIn 0.2s ease; }
        .cpw-modal { width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 24px; box-shadow: 0 30px 70px rgba(15,23,42,0.3), 0 4px 12px rgba(15,23,42,0.08); animation: cpwModalIn 0.32s cubic-bezier(0.16,1,0.3,1); scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
        .cpw-modal::-webkit-scrollbar { width: 8px; }
        .cpw-modal::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 8px; }

        .cpw-header { padding: 1.9rem 1.9rem 1.5rem; position: sticky; top: 0; background: #fff; z-index: 1; border-radius: 24px 24px 0 0; }
        .cpw-header-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .cpw-title { margin: 0; font-size: 1.75rem; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
        .cpw-close { width: 34px; height: 34px; border-radius: 50%; border: none; background: #f1f5f9; color: #334155; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
        .cpw-close:hover { background: #e2e8f0; color: #0f172a; }

        .cpw-steps { display: flex; align-items: center; margin-top: 22px; }
        .cpw-step-pill { display: inline-flex; align-items: center; gap: 8px; background: #111827; color: #fff; padding: 6px 16px 6px 6px; border-radius: 999px; font-weight: 700; font-size: 0.8125rem; white-space: nowrap; }
        .cpw-step-num { width: 22px; height: 22px; border-radius: 50%; background: #fff; color: #111827; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cpw-step-dot { width: 12px; height: 12px; border-radius: 50%; background: #e2e8f0; flex-shrink: 0; }
        .cpw-step-dot.is-done { background: ${BRAND}; }
        .cpw-step-line { flex: 1; height: 2px; min-width: 16px; margin: 0 6px; background-image: linear-gradient(to right, #d1d5db 50%, transparent 50%); background-size: 8px 2px; background-repeat: repeat-x; }

        .cpw-body { padding: 1.7rem 1.9rem; animation: cpwStepIn 0.28s cubic-bezier(0.16,1,0.3,1); }
        .cpw-footer { padding: 1.4rem 1.9rem 1.9rem; display: flex; gap: 12px; }
        .cpw-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
        .cpw-warning-wrap { padding: 0 1.9rem; }

        .cpw-alert { display: flex; align-items: flex-start; gap: 8px; border-radius: 10px; padding: 11px 14px; margin-bottom: 16px; font-size: 0.8125rem; font-weight: 500; line-height: 1.4; }
        .cpw-alert-error { background: #fff1f2; border: 1px solid #fecdd3; color: #b42318; }
        .cpw-alert-warn { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; }
        .cpw-warning-text { margin: 0; font-size: 0.8125rem; color: #c2410c; font-weight: 500; }

        .cpw-field { margin-bottom: 24px; }
        .cpw-label { display: block; font-size: 0.8125rem; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
        .cpw-req { color: ${BRAND}; margin-left: 2px; }

        .cpw-input { width: 100%; padding: 4px 0 10px; border: none; border-bottom: 1.5px solid #e5e7eb; border-radius: 0; font-size: 1.0625rem; font-weight: 500; color: #0f172a; background: transparent; outline: none; box-sizing: border-box; font-family: inherit; transition: border-color 0.15s; }
        .cpw-input::placeholder { color: #cbd5e1; font-weight: 400; }
        .cpw-input:hover { border-color: #cbd5e1; }
        .cpw-input:focus { border-color: ${BRAND}; }
        select.cpw-input { cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none; padding-right: 22px; background-repeat: no-repeat; background-position: right 2px center; background-size: 16px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); }
        .cpw-textarea { min-height: 70px; resize: vertical; font-family: inherit; line-height: 1.5; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 0.9375rem; }
        .cpw-textarea:focus { border-color: ${BRAND}; }

        .cpw-intro { margin: 0 0 20px; font-size: 0.9375rem; color: #64748b; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .cpw-intro strong { color: #0f172a; }
        .cpw-intro-count { color: ${BRAND}; font-weight: 700; font-size: 0.8125rem; }

        .cpw-chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .cpw-chip { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px; border: 2px solid #e2e8f0; background: #fff; color: #374151; font-weight: 500; font-size: 0.8125rem; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .cpw-chip:hover:not(.is-disabled) { border-color: #cbd5e1; transform: translateY(-1px); }
        .cpw-chip.is-selected { font-weight: 700; }
        .cpw-chip.is-disabled { background: #f8fafc; color: #cbd5e1; opacity: 0.5; cursor: not-allowed; }
        .cpw-chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .cpw-chip-check { font-size: 11px; font-weight: 800; }

        .cpw-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .cpw-cat-card { position: relative; border: 1.5px solid #e2e8f0; background: #fdfdfc; border-radius: 13px; padding: 16px 10px 14px; text-align: center; cursor: pointer; font-family: inherit; transition: border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s; }
        .cpw-cat-card:hover { border-color: #f2b8cc; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15,23,42,0.06); }
        .cpw-cat-card.is-selected { border-color: ${BRAND}; background: #fde8f0; box-shadow: 0 4px 14px rgba(238,23,97,0.15); }
        .cpw-cat-check { position: absolute; top: 6px; right: 8px; width: 16px; height: 16px; border-radius: 50%; background: ${BRAND}; color: #fff; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .cpw-cat-icon { font-size: 22px; display: block; margin-bottom: 7px; }
        .cpw-cat-label { font-size: 0.75rem; font-weight: 600; color: #0f172a; display: block; }
        .cpw-cat-other { grid-column: 1 / -1; margin-top: 8px; }

        .cpw-review-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }
        .cpw-review-chip { padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .cpw-review-list-item { padding: 6px 0; border-bottom: 1px solid #eef2f7; font-size: 0.8125rem; }
        .cpw-review-list-item:last-child { border-bottom: none; }
        .cpw-review-list-name { color: #0f172a; font-weight: 600; }
        .cpw-review-list-sub { color: #94a3b8; }

        .cpw-btn-back { width: 52px; height: 52px; border-radius: 14px; border: 1.5px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; flex-shrink: 0; transition: border-color 0.15s, color 0.15s; font-family: inherit; }
        .cpw-btn-back:hover { border-color: #cbd5e1; color: #334155; }
        .cpw-btn-primary { flex: 1; padding: 1rem 1.5rem; border-radius: 14px; border: none; background: ${BRAND_DARK}; color: #fff; font-weight: 700; font-size: 1rem; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: opacity 0.15s, transform 0.12s; }
        .cpw-btn-primary:hover:not(:disabled) { opacity: 0.92; }
        .cpw-btn-primary:active:not(:disabled) { transform: scale(0.99); }
        .cpw-btn-primary:disabled { background: #f3b5c9; cursor: not-allowed; }

        @keyframes cpwFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cpwModalIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes cpwStepIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 640px) {
          .cpw-overlay { padding: 0; align-items: flex-end; }
          .cpw-modal { max-width: 100%; width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; }
          .cpw-header { padding: 1.3rem 1.2rem 1.1rem; border-radius: 20px 20px 0 0; }
          .cpw-title { font-size: 1.4rem; }
          .cpw-body { padding: 1.2rem; }
          .cpw-warning-wrap { padding: 0 1.2rem; }
          .cpw-footer { padding: 1.1rem 1.2rem 1.2rem; }
        }
        @media (max-width: 520px) {
          .cpw-row2 { grid-template-columns: 1fr; }
          .cpw-cat-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
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

  if (!category) return <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Pick a category first.</p>;

  if (category === 'startup') {
    return (
      <>
        <Row2>
          <Field label="Startup name" required><input className="cpw-input" value={v('s_name')} onChange={(e) => setP('s_name', e.target.value)} /></Field>
          <Field label="Founded year" required><input type="number" className="cpw-input" value={v('s_founded')} onChange={(e) => setP('s_founded', e.target.value)} min={1990} max={2026} /></Field>
        </Row2>
        <Row2>
          <Field label="Legal entity type" required>
            <select className="cpw-input" value={v('s_entity')} onChange={(e) => setP('s_entity', e.target.value)}>
              <option value="">Select…</option>{ENTITY_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Stage" required>
            <select className="cpw-input" value={v('s_stage')} onChange={(e) => setP('s_stage', e.target.value)}>
              <option value="">Select…</option>{STARTUP_STAGES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </Row2>
        <Field label="DPIIT registered?">
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8125rem' }}>
              <input type="radio" name="s_dpiit" checked={v('s_dpiit') === 'yes'} onChange={() => setP('s_dpiit', 'yes')} /> Yes
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8125rem' }}>
              <input type="radio" name="s_dpiit" checked={v('s_dpiit') === 'no'} onChange={() => setP('s_dpiit', 'no')} /> No
            </label>
          </div>
          {v('s_dpiit') === 'yes' && (
            <div style={{ marginTop: 10 }}>
              <input className="cpw-input" placeholder="DPIIT certificate number" value={v('s_dpiit_number')} onChange={(e) => setP('s_dpiit_number', e.target.value)} />
            </div>
          )}
        </Field>
        <Row2>
          <Field label="Team size" required>
            <select className="cpw-input" value={v('s_team_size')} onChange={(e) => setP('s_team_size', e.target.value)}>
              <option value="">Select…</option>{TEAM_SIZES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Revenue status" required>
            <select className="cpw-input" value={v('s_revenue_status')} onChange={(e) => setP('s_revenue_status', e.target.value)}>
              <option value="">Select…</option>{REVENUE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </Row2>
        <Field label="One-line pitch" required>
          <input className="cpw-input" maxLength={140} value={v('s_pitch')} onChange={(e) => setP('s_pitch', e.target.value)} />
        </Field>

        <p style={{ margin: '20px 0 10px', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Founders</p>
        {founders.map((f, i) => (
          <div key={i} style={{ border: '1px dashed #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 10, position: 'relative' }}>
            {founders.length > 1 && (
              <button type="button" onClick={() => setFounders((prev) => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>remove</button>
            )}
            <Row2>
              <Field label="Founder name"><input className="cpw-input" value={f.name} onChange={(e) => setFounders((prev) => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} /></Field>
              <Field label="Role"><input className="cpw-input" value={f.role} onChange={(e) => setFounders((prev) => prev.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x))} /></Field>
            </Row2>
            <Field label="LinkedIn"><input type="url" className="cpw-input" value={f.linkedin_url} onChange={(e) => setFounders((prev) => prev.map((x, idx) => idx === i ? { ...x, linkedin_url: e.target.value } : x))} /></Field>
          </div>
        ))}
        <button type="button" onClick={() => setFounders((prev) => [...prev, { name: '', role: '', linkedin_url: '' }])} style={{ width: '100%', padding: '9px 0', border: '1.5px dashed #e2e8f0', borderRadius: 8, background: 'none', color: '#0f172a', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add founder
        </button>

        <p style={{ margin: '20px 0 10px', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funding history</p>
        {fundingRounds.map((r, i) => (
          <div key={i} style={{ border: '1px dashed #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 10, position: 'relative' }}>
            <button type="button" onClick={() => setFundingRounds((prev) => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>remove</button>
            <Row2>
              <Field label="Round type">
                <select className="cpw-input" value={r.round_type} onChange={(e) => setFundingRounds((prev) => prev.map((x, idx) => idx === i ? { ...x, round_type: e.target.value } : x))}>
                  <option value="">Select…</option>{ROUND_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Amount"><input className="cpw-input" placeholder="e.g. $500K" value={r.amount} onChange={(e) => setFundingRounds((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))} /></Field>
            </Row2>
            <Row2>
              <Field label="Lead investor(s)"><input className="cpw-input" value={r.lead_investor} onChange={(e) => setFundingRounds((prev) => prev.map((x, idx) => idx === i ? { ...x, lead_investor: e.target.value } : x))} /></Field>
              <Field label="Date"><input type="month" className="cpw-input" value={r.round_date} onChange={(e) => setFundingRounds((prev) => prev.map((x, idx) => idx === i ? { ...x, round_date: e.target.value } : x))} /></Field>
            </Row2>
          </div>
        ))}
        <button type="button" onClick={() => setFundingRounds((prev) => [...prev, { round_type: '', amount: '', lead_investor: '', round_date: '' }])} style={{ width: '100%', padding: '9px 0', border: '1.5px dashed #e2e8f0', borderRadius: 8, background: 'none', color: '#0f172a', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add funding round
        </button>

        <Field label="Currently raising?" required>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {['yes', 'planning', 'no'].map((opt) => (
              <label key={opt} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8125rem' }}>
                <input type="radio" name="s_raising" checked={v('s_raising') === opt} onChange={() => setP('s_raising', opt)} />
                {opt === 'yes' ? 'Yes' : opt === 'planning' ? 'Planning soon' : 'No'}
              </label>
            ))}
          </div>
        </Field>
        {v('s_raising') && v('s_raising') !== 'no' && (
          <Field label="Amount seeking"><input className="cpw-input" placeholder="e.g. $500K" value={v('s_amount_seeking')} onChange={(e) => setP('s_amount_seeking', e.target.value)} /></Field>
        )}
        <Row2>
          <Field label="Crunchbase profile"><input type="url" className="cpw-input" value={v('s_crunchbase')} onChange={(e) => setP('s_crunchbase', e.target.value)} /></Field>
          <Field label="Tracxn profile"><input type="url" className="cpw-input" value={v('s_tracxn')} onChange={(e) => setP('s_tracxn', e.target.value)} /></Field>
        </Row2>
      </>
    );
  }

  if (INTEREST_CATEGORIES.includes(category)) {
    return (
      <>
        <Row2>
          <Field label="Firm / fund name"><input className="cpw-input" value={v('i_firm')} onChange={(e) => setP('i_firm', e.target.value)} /></Field>
          <Field label="Investor type" required>
            <select className="cpw-input" value={v('i_type')} onChange={(e) => setP('i_type', e.target.value)}>
              <option value="">Select…</option>{INVESTOR_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </Row2>
        <Row2>
          <Field label="Check size range" required>
            <select className="cpw-input" value={v('i_check_size')} onChange={(e) => setP('i_check_size', e.target.value)}>
              <option value="">Select…</option>{CHECK_SIZES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Stage focus" required>
            <select className="cpw-input" value={v('i_stage_focus')} onChange={(e) => setP('i_stage_focus', e.target.value)}>
              <option value="">Select…</option>{STAGE_FOCUS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </Row2>
        <Field label="Sector focus" required><input className="cpw-input" placeholder="e.g. Fintech, SaaS" value={v('i_sector_focus')} onChange={(e) => setP('i_sector_focus', e.target.value)} /></Field>
        <Field label="Geography focus" required><input className="cpw-input" placeholder="e.g. India, SEA" value={v('i_geo_focus')} onChange={(e) => setP('i_geo_focus', e.target.value)} /></Field>
      </>
    );
  }

  if (LIGHT_CATEGORIES.includes(category)) {
    return (
      <>
        <Row2>
          <Field label="Program name" required><input className="cpw-input" value={v('a_program_name')} onChange={(e) => setP('a_program_name', e.target.value)} /></Field>
          <Field label="Program duration" required><input className="cpw-input" placeholder="e.g. 12 weeks" value={v('a_duration')} onChange={(e) => setP('a_duration', e.target.value)} /></Field>
        </Row2>
        <Field label="Sector focus" required><input className="cpw-input" value={v('a_sector_focus')} onChange={(e) => setP('a_sector_focus', e.target.value)} /></Field>
        <Field label="Equity taken (%)"><input type="number" className="cpw-input" value={v('a_equity_taken')} onChange={(e) => setP('a_equity_taken', e.target.value)} /></Field>
      </>
    );
  }

  if (CREATOR_CATEGORIES.includes(category)) {
    return (
      <>
        <Field label="Primary platform(s)" required><input className="cpw-input" placeholder="e.g. Instagram, YouTube, LinkedIn" value={v('c_platforms')} onChange={(e) => setP('c_platforms', e.target.value)} /></Field>
        <Field label="Content niche" required><input className="cpw-input" value={v('c_niche')} onChange={(e) => setP('c_niche', e.target.value)} /></Field>
        <Field label="Media kit / portfolio link"><input type="url" className="cpw-input" value={v('c_mediakit')} onChange={(e) => setP('c_mediakit', e.target.value)} /></Field>
      </>
    );
  }

  if (category === 'lawyer') {
    return (
      <>
        <Field label="Firm name (or 'Independent')" required><input className="cpw-input" value={v('l_firm')} onChange={(e) => setP('l_firm', e.target.value)} /></Field>
        <Field label="Practice areas" required><input className="cpw-input" placeholder="e.g. Corporate, VC/Fundraising, IP" value={v('l_practice_areas')} onChange={(e) => setP('l_practice_areas', e.target.value)} /></Field>
        <Row2>
          <Field label="Jurisdictions qualified in" required><input className="cpw-input" value={v('l_jurisdiction')} onChange={(e) => setP('l_jurisdiction', e.target.value)} /></Field>
          <Field label="Years of experience" required><input type="number" className="cpw-input" value={v('l_years_experience')} onChange={(e) => setP('l_years_experience', e.target.value)} /></Field>
        </Row2>
      </>
    );
  }

  if (category === 'cacs') {
    return (
      <>
        <Row2>
          <Field label="Firm name" required><input className="cpw-input" value={v('cs_firm')} onChange={(e) => setP('cs_firm', e.target.value)} /></Field>
          <Field label="ICAI / ICSI membership no." required><input className="cpw-input" value={v('cs_membership_number')} onChange={(e) => setP('cs_membership_number', e.target.value)} /></Field>
        </Row2>
        <Field label="Services offered" required><input className="cpw-input" placeholder="e.g. Auditing, ROC filings, Valuation" value={v('cs_services')} onChange={(e) => setP('cs_services', e.target.value)} /></Field>
        <Field label="Years of experience" required><input type="number" className="cpw-input" value={v('cs_years_experience')} onChange={(e) => setP('cs_years_experience', e.target.value)} /></Field>
      </>
    );
  }

  if (category === 'ibanker') {
    return (
      <>
        <Row2>
          <Field label="Firm / bank name" required><input className="cpw-input" value={v('ib_firm')} onChange={(e) => setP('ib_firm', e.target.value)} /></Field>
          <Field label="Years of experience" required><input type="number" className="cpw-input" value={v('ib_years_experience')} onChange={(e) => setP('ib_years_experience', e.target.value)} /></Field>
        </Row2>
        <Field label="Deal types handled" required><input className="cpw-input" placeholder="e.g. M&A, IPO, PE/VC Fundraising" value={v('ib_deal_types')} onChange={(e) => setP('ib_deal_types', e.target.value)} /></Field>
      </>
    );
  }

  if (category === 'banker') {
    return (
      <>
        <Row2>
          <Field label="Bank name" required><input className="cpw-input" value={v('bk_bank_name')} onChange={(e) => setP('bk_bank_name', e.target.value)} /></Field>
          <Field label="Years of experience" required><input type="number" className="cpw-input" value={v('bk_years_experience')} onChange={(e) => setP('bk_years_experience', e.target.value)} /></Field>
        </Row2>
        <Field label="Banking vertical" required>
          <select className="cpw-input" value={v('bk_vertical')} onChange={(e) => setP('bk_vertical', e.target.value)}>
            <option value="">Select…</option>{BANKING_VERTICALS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </>
    );
  }

  if (GENERIC_CATEGORIES.includes(category)) {
    return (
      <>
        <Field label="Organization / affiliation"><input className="cpw-input" value={v('g_organization')} onChange={(e) => setP('g_organization', e.target.value)} /></Field>
        <Field label="Role / area of focus" required><input className="cpw-input" value={v('g_role')} onChange={(e) => setP('g_role', e.target.value)} /></Field>
      </>
    );
  }

  return null;
}
