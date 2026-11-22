import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import VerificationRow from "../../components/admin/VerificationRow";
import DocumentPreviewModal from "../../components/admin/modals/DocumentPreviewModal";
import { PageHeader, SearchBar, Select } from "../../components/common";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi } from "@/features/admin/backendApi";
import type { AdminOutletContext, EmployerVerification, VerificationStatus } from "../../types";

type StatusFilter = "all" | VerificationStatus;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "incomplete", label: "Incomplete" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type PreviewState = { id: string; documentId: string; rejecting: boolean };

export default function VerificationPage() {
  const { verifications, pendingCount, updateVerification, isLoading, error, retry } =
    useOutletContext<AdminOutletContext>();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewItem, setPreviewItem] = useState<EmployerVerification | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verifications.filter((v) =>
      (statusFilter === "all" || v.status === statusFilter) &&
      (q === "" || v.company.toLowerCase().includes(q)),
    );
  }, [verifications, query, statusFilter]);

  function closePreview() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    setObjectUrls([]);
    setPreview(null);
    setPreviewItem(null);
    setPreviewError(null);
  }

  async function openPreview(id: string, documentId: string) {
    if (!token) {
      setPreviewError("Your admin session has expired.");
      return;
    }
    closePreview();
    setPreview({ id, documentId, rejecting: false });
    setIsLoadingPreview(true);
    setLoadingPreviewId(id);
    setPreviewError(null);
    const createdUrls: string[] = [];
    try {
      const { data } = await adminApi.companyVerification(token, id);
      if (data.documents.length === 0) {
        setPreviewError("No verification documents are attached to this request.");
        return;
      }
      const documents = await Promise.all(data.documents.map(async (document) => {
        const blob = await adminApi.companyVerificationDocument(token, id, String(document.id));
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);
        return {
          id: String(document.id),
          name: document.original_filename,
          url,
        };
      }));
      setObjectUrls(createdUrls);
      const company = data.company.name;
      const submitted = data.submitted_at ? new Date(data.submitted_at) : null;
      const item: EmployerVerification = {
        id: String(data.id),
        company,
        initials: company.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
        submittedBy: data.company.owner.name,
        submittedAt: submitted && !Number.isNaN(submitted.getTime())
          ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(submitted)
          : "Date unavailable",
        status:
          data.status === "verified"
            ? "approved"
            : data.status === "rejected"
              ? "rejected"
              : data.status === "incomplete"
                ? "incomplete"
                : "pending",
        rejectionReason: data.rejection_reason ?? undefined,
        documents,
      };
      setPreviewItem(item);
      setPreview((current) => current ? { ...current, documentId: documentId || documents[0].id } : current);
    } catch (requestError) {
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewError(requestError instanceof Error ? requestError.message : "Unable to load the private verification documents.");
    } finally {
      setIsLoadingPreview(false);
      setLoadingPreviewId(null);
    }
  }

  async function handleReview(id: string, status: VerificationStatus, reason?: string) {
    setIsSaving(true);
    setPreviewError(null);
    try {
      await updateVerification(id, status, reason);
      closePreview();
    } catch (requestError) {
      setPreviewError(requestError instanceof Error ? requestError.message : "Unable to save the decision.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Employer verification"
        subtitle="Review submitted business documents before employers can publish jobs."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-xs font-semibold text-muted shadow-sm hover:border-brand-100 hover:text-brand-700"
              onClick={retry}
              type="button"
            >
              Refresh
            </button>
            <span className="inline-flex h-10 items-center rounded-xl border border-amber-100 bg-amber-50 px-4 text-xs font-semibold text-amber-700">
              {pendingCount} pending review
            </span>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2.5 max-[680px]:flex-col">
        <SearchBar className="w-full sm:w-72 max-[680px]:w-full" value={query} onChange={setQuery} placeholder="Search companies" />
        <Select ariaLabel="Filter by status" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={STATUS_OPTIONS} />
      </div>

      {(error || previewError) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <span>{previewError ?? error}</span>
          {error && retry && <button className="font-semibold underline" onClick={retry} type="button">Try again</button>}
        </div>
      )}
      {isLoading ? (
        <p aria-live="polite" className="py-10 text-center text-sm text-muted">Loading employer verification requests…</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-muted">No companies match your filters.</p>
          ) : (
            filtered.map((item) => (
              <VerificationRow
                key={item.id}
                item={item}
                isLoadingPreview={loadingPreviewId === item.id}
                onPreview={(id, documentId) => void openPreview(id, documentId)}
              />
            ))
          )}
        </div>
      )}

      {preview && previewItem && (
        <DocumentPreviewModal
          key={`${preview.id}-${preview.documentId}`}
          actionError={previewError}
          initialDocumentId={preview.documentId}
          isSaving={isSaving}
          item={previewItem}
          onClose={closePreview}
          onApprove={(id) => void handleReview(id, "approved")}
          onReject={(id, reason) => void handleReview(id, "rejected", reason)}
          startRejecting={preview.rejecting}
        />
      )}
      {isLoadingPreview && <span className="sr-only" aria-live="polite">Loading verification documents…</span>}
    </section>
  );
}
