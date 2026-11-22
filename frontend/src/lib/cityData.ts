type CityRecord = {
  country: string;
  name: string;
};

let cityDataPromise: Promise<CityRecord[]> | null = null;

function isCityRecord(value: unknown): value is CityRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "country" in value &&
    typeof value.country === "string" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

async function loadCityData(): Promise<CityRecord[]> {
  const { default: citiesUrl } = await import("cities.json?url");
  const response = await fetch(citiesUrl);
  if (!response.ok) {
    throw new Error(`Unable to load city data (${response.status}).`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isCityRecord)) {
    throw new Error("The city data is invalid.");
  }

  return data;
}

export async function loadCitiesForCountry(countryCode: string): Promise<string[]> {
  if (!cityDataPromise) {
    cityDataPromise = loadCityData().catch((error: unknown) => {
      cityDataPromise = null;
      throw error;
    });
  }

  const cities = await cityDataPromise;
  return [
    ...new Set(
      cities
        .filter((city) => city.country === countryCode)
        .map((city) => city.name),
    ),
  ].sort((left, right) => left.localeCompare(right));
}
