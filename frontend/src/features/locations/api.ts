import { apiRequest } from "@/lib/axios";
import type { PhilippineAddress, PhilippineLocationOption } from "@/features/locations/types";

type LocationResponse = { data: PhilippineLocationOption[] };

type CachedOptions = {
  expiresAt: number;
  options: PhilippineLocationOption[];
};

const cacheDurationMs = 24 * 60 * 60 * 1000;
const optionCache = new Map<string, CachedOptions>();
const inFlight = new Map<string, Promise<PhilippineLocationOption[]>>();

async function optionsFor(path: string): Promise<PhilippineLocationOption[]> {
  const cached = optionCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.options;

  const request = inFlight.get(path);
  if (request) return request;

  const pending = apiRequest<LocationResponse>(`/locations/${path}`)
    .then(({ data }) => {
      if (!Array.isArray(data)) {
        throw new Error("The location service returned invalid data.");
      }
      optionCache.set(path, { expiresAt: Date.now() + cacheDurationMs, options: data });
      return data;
    })
    .finally(() => inFlight.delete(path));

  inFlight.set(path, pending);
  return pending;
}

export const philippineLocationsApi = {
  regions: () => optionsFor("regions"),
  provinces: (regionCode: string) => optionsFor(`regions/${regionCode}/provinces`),
  regionLocalities: (regionCode: string) => optionsFor(`regions/${regionCode}/localities`),
  provinceLocalities: (provinceCode: string) => optionsFor(`provinces/${provinceCode}/localities`),
  barangays: (localityCode: string) => optionsFor(`localities/${localityCode}/barangays`),
};

export function formatPhilippineAddressLabel(address: Partial<PhilippineAddress>): string {
  return [
    address.street_address,
    address.barangay_name,
    address.city_municipality_name,
    address.province_name,
    address.region_name,
    address.zip_code,
  ].filter((part): part is string => Boolean(part?.trim())).join(", ");
}
