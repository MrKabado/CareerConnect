import { useMemo, useState, useSyncExternalStore } from "react";
import { applicationStore } from "@/features/applications/applicationData";
import type { ApplicationFilter } from "@/components/ui/applications/ApplicationsMainSection";

export function useUserApplications() {
  const [filter, setFilter] = useState<ApplicationFilter>("All applications");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    applicationStore.getSnapshot()[0]?.id ?? null,
  );
  const applications = useSyncExternalStore(
    applicationStore.subscribe,
    applicationStore.getSnapshot,
    applicationStore.getSnapshot,
  );

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesFilter =
        filter === "All applications" || application.track === filter;
      const matchesQuery =
        !query ||
        `${application.title} ${application.company}`.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [applications, filter, search]);

  function preserveSelectionIfVisible(
    nextFilter: ApplicationFilter,
    nextSearch: string,
  ) {
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

  function handleFilterChange(nextFilter: ApplicationFilter) {
    setFilter(nextFilter);
    preserveSelectionIfVisible(nextFilter, search);
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
    preserveSelectionIfVisible(filter, nextSearch);
  }

  function handleSelect(id: number) {
    setSelectedId((previous) => (previous === id ? null : id));
  }

  return {
    applications,
    filteredApplications,
    filter,
    search,
    selectedId,
    onFilterChange: handleFilterChange,
    onSearchChange: handleSearchChange,
    onSelect: handleSelect,
  };
}
