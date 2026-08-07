"use client";

import { useMemo } from "react";
import { CustomSelect } from "./CustomSelect";
import { CITY_DATA, COUNTRIES, OTHER_CITY_VALUE } from "./constants";

interface CountryCityFieldsProps {
  country: string;
  city: string;
  cityOther: string;
  countryError?: string;
  cityError?: string;
  onChangeCountry: (country: string) => void;
  onChangeCity: (city: string) => void;
  onChangeCityOther: (value: string) => void;
  onBlurCountry: () => void;
  onBlurCity: () => void;
}

function sortedCities(country: string): string[] {
  return (CITY_DATA[country] || []).slice().sort((a, b) => a.localeCompare(b));
}

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));

export function CountryCityFields({
  country,
  city,
  cityOther,
  countryError,
  cityError,
  onChangeCountry,
  onChangeCity,
  onChangeCityOther,
  onBlurCountry,
  onBlurCity,
}: CountryCityFieldsProps) {
  const cityOptions = useMemo(() => {
    const base = sortedCities(country);
    const list = base.includes(city) || !city || city === OTHER_CITY_VALUE ? base : [...base, city];
    return [
      ...list.map((c) => ({ value: c, label: c })),
      { value: OTHER_CITY_VALUE, label: "Other (add manually)" },
    ];
  }, [country, city]);

  return (
    <div className="field-row">
      <div className={"field" + (countryError ? " has-error" : "")} id="field-country">
        <label>Country *</label>
        <CustomSelect
          options={COUNTRY_OPTIONS}
          value={country}
          onChange={(v) => {
            const firstCity = sortedCities(v)[0] || "";
            onChangeCountry(v);
            onChangeCity(firstCity);
            onChangeCityOther("");
          }}
          onBlurValidate={onBlurCountry}
          searchable
          searchPlaceholder="Search countries…"
          ariaLabel="Country"
        />
        <div className={"field-error" + (countryError ? " visible" : "")} id="err-country">
          {countryError}
        </div>
      </div>
      <div className={"field" + (cityError ? " has-error" : "")} id="field-city">
        <label>City *</label>
        <CustomSelect
          options={cityOptions}
          value={city}
          onChange={(v) => onChangeCity(v)}
          onBlurValidate={onBlurCity}
          ariaLabel="City"
        />
        {city === OTHER_CITY_VALUE && (
          <input
            type="text"
            placeholder="Enter city name"
            style={{ marginTop: 8 }}
            value={cityOther}
            onChange={(e) => onChangeCityOther(e.target.value)}
            onBlur={onBlurCity}
          />
        )}
        <div className={"field-error" + (cityError ? " visible" : "")} id="err-city">
          {cityError}
        </div>
      </div>
    </div>
  );
}
