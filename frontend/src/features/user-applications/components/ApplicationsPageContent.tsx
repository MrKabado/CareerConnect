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
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
  reload: () => void;
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
  isLoading,
  error,
  hasMore,
  loadMore,
  retry,
  reload,
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
        {error && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
            <span>{error}</span>
            <button className="font-semibold underline" onClick={retry} type="button">Try again</button>
          </div>
        )}
        {isLoading && applications.length === 0 && (
          <p aria-live="polite" className="mb-3 text-sm text-[#718184]">Loading your applications…</p>
        )}
        <ApplicationsTableSection
          applications={filteredApplications}
          onInterviewUpdated={reload}
          onSelect={onSelect}
          selectedId={selectedId}
        />
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              className="rounded-lg border border-[#dcebea] bg-white px-4 py-2 text-xs font-semibold text-[#16878b] disabled:opacity-50"
              disabled={isLoading}
              onClick={loadMore}
              type="button"
            >
              {isLoading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
