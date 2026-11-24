import CompanyRatingPanel from "@/components/common/user/CompanyRatingPanel";
import {
  CompanyApplicationProcess,
  CompanyBenefits,
  CompanyContact,
  CompanyHero,
  CompanyHighlights,
  CompanyHiringSetupDetails,
  CompanyLifeAt,
  CompanyLocations,
  CompanyOpenRoles,
  CompanyProfileHeader,
} from "@/components/common/user/companyProfileComponents";
import Footer from "@/components/common/user/userFooter";
import PublicCompanyMediaGallery from "@/features/company-verification/components/PublicCompanyMediaGallery";
import PublicCompanyVerificationSummary from "@/features/company-verification/components/PublicCompanyVerificationSummary";
import { usePublicCompanyProfile } from "@/features/user-company-profile/hooks/usePublicCompanyProfile";

export default function PublicCompanyProfilePageContent() {
  const {
    profile,
    publicProfile,
    isEmployerProfile,
    verification,
    listingsLoading,
    listingsError,
    retryListings,
  } = usePublicCompanyProfile();

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <CompanyProfileHeader />
      <CompanyHero companySlug={profile.id} profile={publicProfile} />
      <main className="flex-1 px-6 py-5 max-[680px]:px-4 max-[680px]:py-4">
        <div className="mx-auto grid max-w-[1136px] grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)] items-start gap-5 max-[900px]:grid-cols-1">
          <div className="space-y-4">
            <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
              <h2 className="text-[13px] font-bold text-[#2d4244]">Company overview</h2>
              <p className="mt-2 text-[10px] leading-5 text-[#657779]">{profile.overview}</p>
            </section>
            <PublicCompanyVerificationSummary companyName={profile.name} />
            <CompanyHighlights profile={publicProfile} />
            <CompanyApplicationProcess steps={profile.applicationProcess} />
            <CompanyHiringSetupDetails profile={publicProfile} />
            <CompanyLifeAt profile={publicProfile} />
            <PublicCompanyMediaGallery media={isEmployerProfile ? verification.record.media : undefined} />
            <CompanyRatingPanel companyName={profile.name} companySlug={profile.id} />
            <CompanyContact profile={publicProfile} />
            <CompanyLocations profile={publicProfile} />
            <CompanyBenefits profile={publicProfile} />
          </div>
          <CompanyOpenRoles
            profile={publicProfile}
            isLoading={listingsLoading}
            error={listingsError}
            onRetry={retryListings}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
