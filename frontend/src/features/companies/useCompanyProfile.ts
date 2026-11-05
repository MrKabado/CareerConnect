import { useSyncExternalStore } from "react";
import {
  getCompanyProfileBySlug,
  getCompanyProfileOverrides,
  getCompanyProfileSlug,
  subscribeCompanyProfiles,
} from "@/features/companies/companyProfiles";

export function useCompanyProfile(companyName: string) {
  useSyncExternalStore(
    subscribeCompanyProfiles,
    getCompanyProfileOverrides,
    getCompanyProfileOverrides,
  );
  const slug = getCompanyProfileSlug(companyName);
  return getCompanyProfileBySlug(slug);
}
