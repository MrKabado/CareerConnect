import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import VerificationRow from "../../components/admin/VerificationRow";
import DocumentPreviewModal from "../../components/admin/modals/DocumentPreviewModal";
import { PageHeader, SearchBar, Select } from "../../components/common";
import type { AdminOutletContext, VerificationStatus } from "../../types";

type StatusFilter = "all" | VerificationStatus;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface PreviewState {
  id: string;
  documentId: string;
  rejecting: boolean;
}

export default function VerificationPage() {
  const { verifications, pendingCount, updateVerification } =
    useOutletContext<AdminOutletContext>();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verifications.filter(
      (v) =>
        (statusFilter === "all" || v.status === statusFilter) &&
        (q === "" || v.company.toLowerCase().includes(q))
    );
  }, [verifications, query, statusFilter]);

  const previewItem = preview
    ? verifications.find((v) => v.id === preview.id)
    : undefined;

  return (
    <section>
      <PageHeader
        title="Employer verification"
        subtitle="Review submitted business documents before employers can publish jobs."
        actions={
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
            {pendingCount} pending review
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2.5 max-[680px]:flex-col">
        <SearchBar
          className="w-full sm:w-72 max-[680px]:w-full"
          value={query}
          onChange={setQuery}
          placeholder="Search companies"
        />
        <Select
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-3.5">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-muted">No companies match your filters.</p>
        ) : (
          filtered.map((item) => (
            <VerificationRow
              key={item.id}
              item={item}
              onPreview={(id, documentId) =>
                setPreview({ id, documentId, rejecting: false })
              }
            />
          ))
        )}
      </div>

      {preview && previewItem && (
        <DocumentPreviewModal
          key={`${preview.id}-${preview.documentId}`}
          item={previewItem}
          initialDocumentId={preview.documentId}
          startRejecting={preview.rejecting}
          onClose={() => setPreview(null)}
          onApprove={(id) => {
            updateVerification(id, "approved");
            setPreview(null);
          }}
          onReject={(id, reason) => {
            updateVerification(id, "rejected", reason);
            setPreview(null);
          }}
        />
      )}
    </section>
  );
}
