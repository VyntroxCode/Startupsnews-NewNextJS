'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { COUNTRIES } from '@/constants/countries';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SELECT_SKIN } from '@/components/user/CompleteProfileWizard';

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));

/**
 * Red "add your location" card on the member dashboard, shown while the profile is missing a city
 * or country. Nearby events and the "dropped in <city> this week" line both key off the city, so
 * without one the member only ever sees random events. Saves through the same
 * `POST /api/public-auth/update-profile` the Complete Profile wizard uses — only `country` and
 * `city` are sent, and that endpoint leaves every field it isn't given untouched.
 */
export default function LocationPrompt({
  initialCountry,
  initialCity,
  onSaved,
}: {
  initialCountry: string | null;
  initialCity: string | null;
  onSaved: (country: string, city: string) => void;
}) {
  const reduced = useReducedMotion();
  const [country, setCountry] = useState(initialCountry || '');
  const [city, setCity] = useState(initialCity || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = country.trim();
    const ct = city.trim();
    if (!c || !ct) {
      setError('Please choose your country and enter your city.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('pub_auth_token');
      const res = await fetch('/api/public-auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ country: c, city: ct }),
      });
      const d = await res.json().catch(() => null);
      if (!d?.success) throw new Error(d?.error || 'save failed');
      // Keep the cached login user in step, like the wizard does after a save.
      try {
        const raw = localStorage.getItem('pub_auth_user');
        if (raw) localStorage.setItem('pub_auth_user', JSON.stringify({ ...JSON.parse(raw), country: c, city: ct }));
        window.dispatchEvent(new Event('pub-auth-changed'));
      } catch {
        /* noop */
      }
      onSaved(c, ct);
    } catch {
      setError("We couldn't save your location. Please try again.");
      setSaving(false);
    }
  };

  return (
    <motion.form
      onSubmit={save}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      role="region"
      aria-label="Add your location"
      className="rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-[17px] font-extrabold leading-snug text-red-700 sm:text-[18px]">
            Tell us where you&apos;re based
          </h2>
          <p className="m-0 mt-1 text-[14px] leading-relaxed text-red-700/90">
            Add your country and city so we can show you startup and tech events happening near you, along with local funding news picked for you.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex min-w-0 flex-col">
          <label className="mb-1.5 text-[13px] font-semibold text-db-ink">
            Country <span className="text-red-600">*</span>
          </label>
          <div className={SELECT_SKIN}>
            <CustomSelect
              ariaLabel="Country"
              searchable
              placeholder="Select country"
              options={COUNTRY_OPTIONS}
              value={country}
              onChange={(v) => {
                setCountry(v);
                setError('');
              }}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <label htmlFor="dash-location-city" className="mb-1.5 text-[13px] font-semibold text-db-ink">
            City <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <MapPin size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-db-muted" />
            <input
              id="dash-location-city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setError('');
              }}
              placeholder="e.g. Mumbai"
              autoComplete="address-level2"
              className="box-border h-12 w-full rounded-xl border border-solid border-db-line bg-white pl-11 pr-4 font-[inherit] text-[15px] font-medium text-db-ink outline-none transition placeholder:font-normal placeholder:text-[#b5b0bd] hover:border-[#d4cfdc] focus:border-db-pink focus:ring-4 focus:ring-db-pink/10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-[14px] font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save location'}
        </button>
      </div>

      {error && (
        <p role="alert" className="m-0 mt-3 text-[13px] font-semibold text-red-700">
          {error}
        </p>
      )}
    </motion.form>
  );
}
