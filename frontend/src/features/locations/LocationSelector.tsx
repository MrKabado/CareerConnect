import { useEffect, useMemo, useRef, useState } from "react";
import { philippineLocationsApi } from "@/features/locations/api";
import {
  emptyPhilippineAddress,
  type PhilippineAddress,
  type PhilippineLocationOption,
} from "@/features/locations/types";

const fieldClassName =
  "w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none transition focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15 disabled:cursor-not-allowed disabled:bg-[#f5f8f8] disabled:text-[#8a999a]";
const independentProvinceCode = "__independent_city__";

type SearchableSelectProps = {
  label: string;
  value: string;
  selectedName?: string | null;
  options: PhilippineLocationOption[];
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  onSelect: (option: PhilippineLocationOption | null) => void;
};

function SearchableSelect({
  label,
  value,
  selectedName,
  options,
  disabled = false,
  loading = false,
  required = false,
  onSelect,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.code === value);
  const selectedLabel = selected?.name ?? selectedName ?? "";
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? options.filter((option) => option.name.toLocaleLowerCase().includes(normalizedQuery))
      : options;
  }, [options, query]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !value ? `Select a ${label.toLocaleLowerCase()}.` : "",
    );
  }, [label, required, value]);

  return (
    <div className="relative min-w-0">
      <label className="mb-1.5 block text-xs font-semibold text-[#526365]">
        {label}{required ? " *" : ""}
      </label>
      <input
        ref={inputRef}
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
        className={fieldClassName}
        disabled={disabled}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setOpen(true);
          if (value) onSelect(null);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={loading ? "Loading locations…" : `Search ${label.toLocaleLowerCase()}`}
        required={required}
        role="combobox"
        value={open ? query : selectedLabel}
      />
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dfe8e7] bg-white py-1 shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-[#718586]" role="status">Loading locations…</p>
          ) : filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.code}
                className="block w-full px-3 py-2 text-left text-xs text-[#344749] hover:bg-[#eff8f7] hover:text-[#067476]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setQuery("");
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-[#718586]">No matching locations.</p>
          )}
        </div>
      )}
    </div>
  );
}

export type LocationSelectorProps = {
  value: PhilippineAddress;
  onChange: (address: PhilippineAddress) => void;
  required?: boolean;
  requireBarangay?: boolean;
  requireStreetAddress?: boolean;
  showStreetAddress?: boolean;
  legacyLocation?: string | null;
  title?: string;
};

export default function LocationSelector({
  value,
  onChange,
  required = false,
  requireBarangay = false,
  requireStreetAddress = false,
  showStreetAddress = true,
  legacyLocation,
  title,
}: LocationSelectorProps) {
  const [regionsData, setRegionsData] = useState<{ options: PhilippineLocationOption[] } | null>(null);
  const [provincesData, setProvincesData] = useState<{
    regionCode: string;
    options: PhilippineLocationOption[];
  } | null>(null);
  const [regionalLocalitiesData, setRegionalLocalitiesData] = useState<{
    regionCode: string;
    options: PhilippineLocationOption[];
  } | null>(null);
  const [localitiesData, setLocalitiesData] = useState<{
    provinceCode: string;
    options: PhilippineLocationOption[];
  } | null>(null);
  const [barangaysData, setBarangaysData] = useState<{
    localityCode: string;
    options: PhilippineLocationOption[];
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [independentSelected, setIndependentSelected] = useState(
    () => value.province_code === null && value.city_municipality_code !== null,
  );

  useEffect(() => {
    let active = true;
    philippineLocationsApi.regions()
      .then((options) => { if (active) setRegionsData({ options }); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load regions.");
      });
    return () => { active = false; };
  }, [retryKey]);

  useEffect(() => {
    if (!value.region_code) return;

    let active = true;
    const regionCode = value.region_code;
    Promise.all([
      philippineLocationsApi.provinces(regionCode),
      philippineLocationsApi.regionLocalities(regionCode),
    ])
      .then(([provinceOptions, localityOptions]) => {
        if (!active) return;
        setProvincesData({ regionCode, options: provinceOptions });
        setRegionalLocalitiesData({ regionCode, options: localityOptions });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load regional locations.");
      });
    return () => { active = false; };
  }, [retryKey, value.region_code]);

  useEffect(() => {
    if (!value.province_code) return;

    let active = true;
    const provinceCode = value.province_code;
    philippineLocationsApi.provinceLocalities(provinceCode)
      .then((options) => { if (active) setLocalitiesData({ provinceCode, options }); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load cities and municipalities.");
      });
    return () => { active = false; };
  }, [retryKey, value.province_code]);

  useEffect(() => {
    if (!value.city_municipality_code) return;

    let active = true;
    const localityCode = value.city_municipality_code;
    philippineLocationsApi.barangays(localityCode)
      .then((options) => { if (active) setBarangaysData({ localityCode, options }); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load barangays.");
      });
    return () => { active = false; };
  }, [retryKey, value.city_municipality_code]);

  const regions = regionsData?.options ?? [];
  const provinces = value.region_code && provincesData?.regionCode === value.region_code
    ? provincesData.options
    : [];
  const regionalLocalities = value.region_code && regionalLocalitiesData?.regionCode === value.region_code
    ? regionalLocalitiesData.options
    : [];
  const localities = value.province_code && localitiesData?.provinceCode === value.province_code
    ? localitiesData.options
    : [];
  const barangays = value.city_municipality_code && barangaysData?.localityCode === value.city_municipality_code
    ? barangaysData.options
    : [];
  const loadingRegions = !regionsData && !loadError;
  const loadingProvinces = Boolean(value.region_code && provincesData?.regionCode !== value.region_code && !loadError);
  const loadingRegionalLocalities = Boolean(value.region_code && regionalLocalitiesData?.regionCode !== value.region_code && !loadError);
  const loadingLocalities = Boolean(value.region_code && (value.province_code
    ? localitiesData?.provinceCode !== value.province_code
    : regionalLocalitiesData?.regionCode !== value.region_code) && !loadError);
  const loadingBarangays = Boolean(value.city_municipality_code
    && barangaysData?.localityCode !== value.city_municipality_code
    && !loadError);

  const hasProvinceChoices = provinces.length > 0;
  const hasIndependentChoices = regionalLocalities.length > 0;
  const cityPathSelected = !hasProvinceChoices || Boolean(value.province_code) || independentSelected;
  const localityOptions = value.province_code ? localities : regionalLocalities;

  function update(patch: Partial<PhilippineAddress>) {
    onChange({ ...value, ...patch });
  }

  function clearLocation() {
    setIndependentSelected(false);
    onChange(emptyPhilippineAddress());
    setLoadError(null);
  }

  return (
    <fieldset className="min-w-0 space-y-3">
      {title ? <legend className="mb-1 text-sm font-semibold text-[#344749]">{title}</legend> : null}
      {legacyLocation && !value.city_municipality_code ? (
        <p className="rounded-lg border border-[#e7efee] bg-[#f7fbfa] px-3 py-2 text-xs text-[#667a7d]">
          Saved location: {legacyLocation}. Choose its PSGC location below to update the structured address.
        </p>
      ) : null}
      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#f1d2d3] bg-[#fff8f8] px-3 py-2 text-xs text-[#8d393e]" role="alert">
          <span>{loadError}</span>
          <button className="font-semibold underline" onClick={() => {
            setRegionsData(null);
            setProvincesData(null);
            setRegionalLocalitiesData(null);
            setLocalitiesData(null);
            setBarangaysData(null);
            setLoadError(null);
            setRetryKey((key) => key + 1);
          }} type="button">
            Retry
          </button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <SearchableSelect
          label="Region"
          value={value.region_code ?? ""}
          selectedName={value.region_name}
          options={regions}
          loading={loadingRegions}
          required={required}
          onSelect={(option) => {
            setIndependentSelected(false);
            update({
              region_code: option?.code ?? null,
              region_name: option?.name ?? null,
              province_code: null,
              province_name: null,
              city_municipality_code: null,
              city_municipality_name: null,
              barangay_code: null,
              barangay_name: null,
              street_address: null,
              zip_code: null,
            });
            setLoadError(null);
          }}
        />
        {hasProvinceChoices || loadingProvinces ? (
          <SearchableSelect
            label={hasIndependentChoices ? "Province or independent city" : "Province"}
            value={independentSelected && !value.province_code ? independentProvinceCode : value.province_code ?? ""}
            selectedName={independentSelected && !value.province_code ? "Independent city (no province)" : value.province_name}
            options={[
              ...(hasIndependentChoices
                ? [{ code: independentProvinceCode, name: "Independent city (no province)" }]
                : []),
              ...provinces,
            ]}
            loading={loadingProvinces || loadingRegionalLocalities}
            disabled={!value.region_code}
            required={required}
            onSelect={(option) => {
              const isIndependent = option?.code === independentProvinceCode;
              setIndependentSelected(isIndependent);
              update({
                province_code: isIndependent ? null : option?.code ?? null,
                province_name: isIndependent ? null : option?.name ?? null,
                city_municipality_code: null,
                city_municipality_name: null,
                barangay_code: null,
                barangay_name: null,
                street_address: null,
                zip_code: null,
              });
              setLoadError(null);
            }}
          />
        ) : null}
        <SearchableSelect
          label="City / Municipality"
          value={value.city_municipality_code ?? ""}
          selectedName={value.city_municipality_name}
          options={localityOptions}
          loading={loadingLocalities}
          disabled={!value.region_code || loadingRegionalLocalities || !cityPathSelected || (hasProvinceChoices && !value.province_code && !independentSelected)}
          required={required}
          onSelect={(option) => {
            update({
              city_municipality_code: option?.code ?? null,
              city_municipality_name: option?.name ?? null,
              barangay_code: null,
              barangay_name: null,
              street_address: null,
              zip_code: option?.zip_code ?? null,
            });
            setLoadError(null);
          }}
        />
        <SearchableSelect
          label="Barangay"
          value={value.barangay_code ?? ""}
          selectedName={value.barangay_name}
          options={barangays}
          loading={loadingBarangays}
          disabled={!value.city_municipality_code}
          required={requireBarangay}
          onSelect={(option) => update({
            barangay_code: option?.code ?? null,
            barangay_name: option?.name ?? null,
          })}
        />
        {showStreetAddress ? (
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-[#526365]">Street address</span>
            <input
              autoComplete="street-address"
              className={fieldClassName}
              maxLength={255}
              onChange={(event) => update({ street_address: event.currentTarget.value || null })}
              placeholder="House number, street, subdivision, or building"
              required={requireStreetAddress}
              value={value.street_address ?? ""}
            />
          </label>
        ) : null}
        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-semibold text-[#526365]">ZIP code</span>
          <input
            autoComplete="postal-code"
            className={fieldClassName}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => update({ zip_code: event.currentTarget.value || null })}
            pattern="\d{4}"
            placeholder="4 digits"
            value={value.zip_code ?? ""}
          />
          <span className="mt-1 block text-[10px] text-[#849293]">Suggested when PSGC has a locality ZIP; you can edit it.</span>
        </label>
      </div>
      <button
        className="text-xs font-semibold text-[#087879] underline underline-offset-2"
        onClick={clearLocation}
        type="button"
      >
        Clear location
      </button>
    </fieldset>
  );
}
