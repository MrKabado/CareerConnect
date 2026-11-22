import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useCompanyProfile } from "@/features/companies/useCompanyProfile";
import { getCompanyProfileSlug } from "@/features/companies/companyProfiles";
import {
  formatListingPay,
  listingText,
  publicJobsApi,
} from "@/features/jobs/backendApi";
import type { CompanyProfile } from "@/features/companies/companyProfiles";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";

export function usePublicCompanyProfile() {
  const { companyName } = useParams();
  const companySlug = getCompanyProfileSlug(companyName ?? "");
  const profile = useCompanyProfile(companySlug);
  const { employer } = useEmployerStatus();
  const verification = useCompanyVerification();
  const [listingsState, setListingsState] = useState<{
    companySlug: string;
    roles: CompanyProfile["openRoles"];
    error: string | null;
  }>({ companySlug: "", roles: [], error: null });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const firstPage = await publicJobsApi.list({
          company_slug: companySlug,
          page: 1,
          per_page: 50,
        });
        const pages = await Promise.all(
          Array.from(
            { length: Math.max(0, firstPage.meta.last_page - 1) },
            (_, index) =>
              publicJobsApi.list({
                company_slug: companySlug,
                page: index + 2,
                per_page: 50,
              }),
          ),
        );
        const listings = [
          ...firstPage.data,
          ...pages.flatMap((page) => page.data),
        ];
        if (!active) return;
        setListingsState({
          companySlug,
          roles: listings.map((listing) => ({
            id: String(listing.id),
            title: listing.title,
            category: listing.category?.name ?? "Uncategorized",
            department: listing.category?.name ?? "",
            location: listing.location,
            type: listing.listing_type === "ojt" ? "OJT" : "Job",
            arrangement:
              listing.work_setup === "onsite"
                ? "On-site"
                : listing.work_setup[0].toLocaleUpperCase() +
                  listing.work_setup.slice(1),
            salary: formatListingPay(listing),
            description: listing.description,
            skills: listingText(listing.requirements),
            responsibilities: listingText(listing.responsibilities),
            schoolPartnerships:
              listing.ojt?.accepted_courses?.join(", ") || undefined,
          })),
          error: null,
        });
      } catch (requestError) {
        if (!active) return;
        setListingsState({
          companySlug,
          roles: [],
          error:
            requestError instanceof Error
              ? requestError.message
              : "Unable to load this company's active opportunities.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [companySlug, retryCount]);

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
    openRoles:
      listingsState.companySlug === companySlug ? listingsState.roles : [],
  };
  const listingsLoading = listingsState.companySlug !== companySlug;

  return {
    profile,
    publicProfile,
    isEmployerProfile,
    verification,
    listingsLoading,
    listingsError:
      listingsLoading ? null : listingsState.error,
    retryListings: () => setRetryCount((count) => count + 1),
  };
}
