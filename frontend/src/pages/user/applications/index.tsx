import { useMemo, useState, useSyncExternalStore } from "react";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import { applicationStore } from "@/features/applications/applicationData";
import ApplicationsMainSection, {
  type ApplicationFilter,
} from "../../../components/ui/applications/ApplicationsMainSection";
import ApplicationsTableSection from "../../../components/ui/applications/ApplicationsTableSection";

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<ApplicationFilter>("All applications");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    () => applicationStore.getSnapshot()[0]?.id ?? null,
  );
  const applications = useSyncExternalStore(
    applicationStore.subscribe,
    applicationStore.getSnapshot,
    applicationStore.getSnapshot,
  );

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesFilter = filter === "All applications" || application.track === filter;
      const matchesQuery =
        !query ||
        `${application.title} ${application.company}`.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [applications, filter, search]);

  function preserveSelectionIfVisible(nextFilter: ApplicationFilter, nextSearch: string) {
    setSelectedId((previousId) => {
      if (previousId === null) return null;
      const selectedApplication = applications.find(
        (application) => application.id === previousId,
      );
      if (!selectedApplication) return null;

      const query = nextSearch.trim().toLowerCase();
      const matchesFilter =
        nextFilter === "All applications" ||
        selectedApplication.track === nextFilter;
      const matchesSearch =
        !query ||
        `${selectedApplication.title} ${selectedApplication.company}`
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch ? previousId : null;
    });
  }

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />

      <main className="mx-auto w-full max-w-284 flex-1 px-6 pt-8 pb-10 max-[680px]:px-4 max-[680px]:pt-6">
        <ApplicationsMainSection
          applications={applications}
          filteredCount={filteredApplications.length}
          filter={filter}
          onFilterChange={(nextFilter) => {
            setFilter(nextFilter);
            preserveSelectionIfVisible(nextFilter, search);
          }}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
            preserveSelectionIfVisible(filter, nextSearch);
          }}
          search={search}
        />
        <ApplicationsTableSection
          applications={filteredApplications}
          onSelect={(id) =>
            setSelectedId((previous) => (previous === id ? null : id))
          }
          selectedId={selectedId}
        />
      </main>
      <Footer />
    </div>
  );
}