import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import ApplicationsMainSection from "@/components/ui/applications/ApplicationsMainSection";
import ApplicationsTableSection from "@/components/ui/applications/ApplicationsTableSection";
import type { Application } from "@/features/applications/applicationData";
import type { ApplicationFilter } from "@/components/ui/applications/ApplicationsMainSection";

type ApplicationsPageContentProps = {
  applications: Application[];
  filteredApplications: Application[];
  filter: ApplicationFilter;
  search: string;
  selectedId: number | null;
  onFilterChange: (filter: ApplicationFilter) => void;
  onSearchChange: (search: string) => void;
  onSelect: (id: number) => void;
};

export default function ApplicationsPageContent({
  applications,
  filteredApplications,
  filter,
  search,
  selectedId,
  onFilterChange,
  onSearchChange,
  onSelect,
}: ApplicationsPageContentProps) {
  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />

      <main className="mx-auto w-full max-w-284 flex-1 px-6 pt-8 pb-10 max-[680px]:px-4 max-[680px]:pt-6">
        <ApplicationsMainSection
          applications={applications}
          filteredCount={filteredApplications.length}
          filter={filter}
          onFilterChange={onFilterChange}
          onSearchChange={onSearchChange}
          search={search}
        />
        <ApplicationsTableSection
          applications={filteredApplications}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      </main>
      <Footer />
    </div>
  );
}
