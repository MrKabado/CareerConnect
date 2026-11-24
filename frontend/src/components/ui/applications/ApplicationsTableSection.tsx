import {
  ApplicationDetailPanel,
  ApplicationTable,
  type Application,
} from "@/components/ui/applications/applicationsComponent";

type ApplicationsTableSectionProps = {
  applications: Application[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onInterviewUpdated?: () => void;
};

export default function ApplicationsTableSection({
  applications,
  selectedId,
  onSelect,
  onInterviewUpdated,
}: ApplicationsTableSectionProps) {
  const selectedApplication = applications.find(
    (application) => application.id === selectedId,
  );

  return (
    <section aria-label="Applications list and selected application details">
      <div
        className={`grid items-start gap-3 max-[860px]:grid-cols-1 ${
          selectedApplication
            ? "grid-cols-[minmax(0,1fr)_280px]"
            : "grid-cols-1"
        }`}
      >
        <ApplicationTable
          applications={applications}
          onSelect={onSelect}
          selectedId={selectedId}
        />
        {selectedApplication && (
          <ApplicationDetailPanel
            application={selectedApplication}
            onClose={() => onSelect(selectedApplication.id)}
            onInterviewUpdated={onInterviewUpdated}
          />
        )}
      </div>
    </section>
  );
}
