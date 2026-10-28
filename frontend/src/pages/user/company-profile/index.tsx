import { useParams } from "react-router";
import Footer from "@/components/common/user/userFooter";
import {
  CompanyApplicationProcess,
  CompanyHero,
  CompanyHighlights,
  CompanyLifeAt,
  CompanyOpenRoles,
  CompanyProfileHeader,
} from "@/components/common/user/companyProfileComponents";
import { getCompanyProfileBySlug } from "@/features/companies/companyProfiles";

export default function CompanyProfilePage() {
  const { companyName } = useParams();
  const profile = getCompanyProfileBySlug(companyName ?? "");

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <CompanyProfileHeader />
      <CompanyHero profile={profile} />
      <main className="flex-1 px-6 py-5 max-[680px]:px-4 max-[680px]:py-4">
        <div className="mx-auto grid max-w-[1080px] grid-cols-[minmax(0,1fr)_250px] items-start gap-5 max-[760px]:grid-cols-1">
          <div className="space-y-4">
            <CompanyOpenRoles profile={profile} />
            <CompanyLifeAt profile={profile} />
          </div>
          <div className="space-y-4">
            <CompanyHighlights profile={profile} />
            <CompanyApplicationProcess steps={profile.applicationProcess} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
