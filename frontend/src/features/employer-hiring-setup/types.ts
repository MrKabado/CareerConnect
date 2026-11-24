import type { CompanyHiringDefaults } from "@/features/companies/companyProfiles";

export type HiringSetupDraft = CompanyHiringDefaults;

export type HiringSetupLocationState = {
  listingId?: string;
  returnTo?: string;
};
