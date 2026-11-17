import { useParams } from "react-router";
import { useCompanyProfile } from "@/features/companies/useCompanyProfile";
import { getCompanyProfileSlug } from "@/features/companies/companyProfiles";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";

export function usePublicCompanyProfile() {
  const { companyName } = useParams();
  const profile = useCompanyProfile(companyName ?? "");
  const { employer } = useEmployerStatus();
  const verification = useCompanyVerification();

  const isEmployerProfile = Boolean(
    employer &&
      getCompanyProfileSlug(employer.companyName) === getCompanyProfileSlug(profile.name),
  );

  const publicProfile = {
    ...profile,
    logoUrl: isEmployerProfile
      ? verification.record.media?.logo?.url ?? profile.logoUrl
      : profile.logoUrl,
    verified: isEmployerProfile
      ? verification.stages.find((stage) => stage.id === "verification_review")?.status === "complete"
      : profile.verified,
  };

  return {
    profile,
    publicProfile,
    isEmployerProfile,
    verification,
  };
}
