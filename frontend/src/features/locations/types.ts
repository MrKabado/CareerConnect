export type PhilippineLocationOption = {
  code: string;
  name: string;
  type?: "city" | "municipality";
  zip_code?: string | null;
};

export type PhilippineAddress = {
  region_code: string | null;
  region_name: string | null;
  province_code: string | null;
  province_name: string | null;
  city_municipality_code: string | null;
  city_municipality_name: string | null;
  barangay_code: string | null;
  barangay_name: string | null;
  street_address: string | null;
  zip_code: string | null;
};

export function emptyPhilippineAddress(): PhilippineAddress {
  return {
    region_code: null,
    region_name: null,
    province_code: null,
    province_name: null,
    city_municipality_code: null,
    city_municipality_name: null,
    barangay_code: null,
    barangay_name: null,
    street_address: null,
    zip_code: null,
  };
}
