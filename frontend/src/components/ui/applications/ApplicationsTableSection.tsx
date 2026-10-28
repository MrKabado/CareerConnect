import {
  ApplicationTable,
  type Application,
} from "@/components/ui/applications/applicationsComponent";

type ApplicationsTableSectionProps = {
  applications: Application[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export default function ApplicationsTableSection({
  applications,
  selectedId,
  onSelect,
}: ApplicationsTableSectionProps) {
  return (
    <section aria-label="Applications list">
      <ApplicationTable
        applications={applications}
        onSelect={onSelect}
        selectedId={selectedId}
      />
    </section>
  );
}
