"use client";

import { useMemo } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { COUNTRIES, OTHER_CITY_VALUE } from "./constants";
import { cityOptionsForCountry } from "@/modules/partnership-events/domain/country-city-data";

interface CountryCityFieldsProps {
  country: string;
  /** Legacy free-text country from before the "Other" row was removed — accepted, never rendered. */
  countryOther?: string;
  city: string;
  cityOther: string;
  countryError?: string;
  cityError?: string;
  /** Cities that have earned a dropdown slot, keyed by country — see promotedCitiesByCountry.
   * Fetched server-side by the page so the list is complete on first paint. */
  promotedCities?: Record<string, string[]>;
  /** Both fields are required by default, as an event listing needs a location. Feature Your
   * Startup asks for the same two fields but does not insist on them, so it passes false and the
   * labels pick up the site's "(optional)" hint instead of an asterisk. */
  required?: boolean;
  /** Locks both selects — used for an online (virtual) event, which has no venue location. */
  locked?: boolean;
  lockedHint?: string;
  onChangeCountry: (country: string) => void;
  onChangeCountryOther: (value: string) => void;
  onChangeCity: (city: string) => void;
  onChangeCityOther: (value: string) => void;
  onBlurCountry: () => void;
  onBlurCity: () => void;
}

/**
 * The City dropdown offers exactly what the admin Partnership Tracker's Add/Edit Event form
 * offers — the curated COUNTRY_CITY_DATA list plus any city that has earned a slot by reaching
 * the listed-event threshold — not a second list of this form's own. Keeping the two in step is
 * what stops the same city being stored under two spellings, which would split its event count
 * and hold it below the threshold /events uses.
 *
 * Being offered here does NOT promise a city its own /events section: that is decided by event
 * count alone (AUTO_SECTION_MIN_EVENTS), so a curated city with one or two listed events shows
 * under "Other Cities" like any other. cityOptionsForCountry canonicalises, so a long name
 * ("United States") still resolves to the tracker's key ("USA") — which is also what this form's
 * own country list shows (constants.ts, switched from "United States" on 2026-09-11).
 *
 * Left in the admin's order, NOT alphabetised — the curated lists are hand-ordered by market
 * importance (India leads with Mumbai / Delhi NCR / Bengaluru), which sorting would throw away.
 * Earned cities are appended after them, alphabetically among themselves.
 */

/** The Country list is every UN member state and nothing else — there is no "Other (add manually)"
 * row anywhere (public forms, /list-your-event, the admin Sales Tracker lead modal), so a country
 * can only ever arrive under a listed spelling. `countryOther` is kept in the form state for
 * older records but is never shown or editable here. */
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));

export function CountryCityFields({
  country,
  city,
  cityOther,
  countryError,
  cityError,
  promotedCities,
  required = true,
  locked = false,
  lockedHint,
  onChangeCountry,
  onChangeCountryOther,
  onChangeCity,
  onChangeCityOther,
  onBlurCountry,
  onBlurCity,
}: CountryCityFieldsProps) {
  const cities = useMemo(() => cityOptionsForCountry(country, promotedCities) ?? [], [country, promotedCities]);
  const cityOptions = useMemo(
    () => [
      ...cities.map((c) => ({ value: c, label: c })),
      { value: OTHER_CITY_VALUE, label: "Other (add manually)", alwaysShow: true },
    ],
    [cities]
  );
  // A country we curate no cities for offers nothing but "Other" — same as the admin form, which
  // drops straight into its free-text "Others…" mode rather than showing a one-option dropdown.
  const noCuratedCities = !!country && cities.length === 0;

  return (
    <div className="field-row">
      <div className={"field" + (countryError ? " has-error" : "")} id="field-country">
        <label>
          Country{required ? " *" : ""}
          {required ? null : <span className="opt"> (optional)</span>}
        </label>
        <CustomSelect
          options={COUNTRY_OPTIONS}
          value={country}
          onChange={(v) => {
            // Changing country clears the city rather than auto-picking the first curated one —
            // the tracker form does the same, and pre-filling "Mumbai" for India was a guess the
            // organiser could easily submit without noticing. A country with no curated list goes
            // straight to manual entry, since there is nothing to pick from.
            const hasCities = (cityOptionsForCountry(v, promotedCities) ?? []).length > 0;
            onChangeCountry(v);
            onChangeCountryOther("");
            onChangeCity(hasCities ? "" : OTHER_CITY_VALUE);
            onChangeCityOther("");
          }}
          onBlurValidate={onBlurCountry}
          disabled={locked}
          searchable
          placeholder={locked ? "Not applicable" : "Select country"}
          ariaLabel="Country"
        />
        {locked && lockedHint ? <div className="hint">{lockedHint}</div> : null}
        <div className={"field-error" + (countryError ? " visible" : "")} id="err-country">
          {countryError}
        </div>
      </div>
      <div className={"field" + (cityError ? " has-error" : "")} id="field-city">
        <label>
          City{required ? " *" : ""}
          {required ? null : <span className="opt"> (optional)</span>}
        </label>
        <CustomSelect
          options={cityOptions}
          value={city}
          onChange={(v) => onChangeCity(v)}
          onBlurValidate={onBlurCity}
          disabled={locked}
          placeholder={locked ? "Not applicable" : country ? "Select city" : "Select a country first"}
          ariaLabel="City"
        />
        {!locked && noCuratedCities && city === OTHER_CITY_VALUE ? (
          <div className="hint">No listed cities for {country}. Type the city name below.</div>
        ) : null}
        {!locked && city === OTHER_CITY_VALUE && (
          <input
            type="text"
            placeholder="Enter city name"
            style={{ marginTop: 8 }}
            value={cityOther}
            onChange={(e) => onChangeCityOther(e.target.value)}
            onBlur={onBlurCity}
          />
        )}
        {locked && lockedHint ? <div className="hint">{lockedHint}</div> : null}
        <div className={"field-error" + (cityError ? " visible" : "")} id="err-city">
          {cityError}
        </div>
      </div>
    </div>
  );
}
