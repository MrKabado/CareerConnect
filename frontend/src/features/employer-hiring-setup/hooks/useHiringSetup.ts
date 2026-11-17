import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  getCompanyProfileSlug,
  toEditableCompanyProfile,
  updateCompanyProfile,
} from "@/features/companies/companyProfiles";
import { useCompanyProfile } from "@/features/companies/useCompanyProfile";
import { companyVerificationApi } from "@/features/company-verification/api";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { defaultHiringSetup } from "@/features/employer-hiring-setup/constants";
import type { HiringSetupDraft, HiringSetupLocationState } from "@/features/employer-hiring-setup/types";

export function useHiringSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { employer } = useEmployerStatus();
  const companyName = employer?.companyName ?? "Maya Philippines";
  const profile = useCompanyProfile(companyName);
  const profileSlug = getCompanyProfileSlug(companyName);

  const listingId = (location.state as HiringSetupLocationState | null)?.listingId ?? "frontend-developer";
  const returnTo = (location.state as HiringSetupLocationState | null)?.returnTo ?? "/employer/listings/review";

  const initialDraft: HiringSetupDraft = profile.hiringDefaults ?? { ...defaultHiringSetup };
  const [draft, setDraft] = useState<HiringSetupDraft>(initialDraft);

  function updateField(field: keyof HiringSetupDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    updateCompanyProfile(profileSlug, {
      ...toEditableCompanyProfile(profile),
      hiringDefaults: draft,
    });
    companyVerificationApi.setHiringDefaultsComplete(
      Object.values(draft).every((value) => value.trim().length > 0),
    );
    window.sessionStorage.setItem("employerListingNotice", "Defaults changed, please confirm again.");
    navigate(returnTo, { state: { listingId } });
  }

  function handleCancel() {
    navigate(returnTo, { state: { listingId } });
  }

  return {
    draft,
    updateField,
    handleSave,
    handleCancel,
    returnTo,
    listingId,
  };
}
