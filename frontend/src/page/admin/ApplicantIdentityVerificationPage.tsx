import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router";
import { Check, FileCheck2, X } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  Modal,
  PageHeader,
  Pagination,
  SearchBar,
  Select,
} from "../../components/common";
import { useAuth } from "@/features/auth/useAuth";
import {
  adminApi,
  type AdminIdentityVerificationDetails,
  type AdminIdentityVerificationRecord,
} from "@/features/admin/backendApi";
import type { AdminOutletContext } from "../../types";

type StatusFilter = "all" | "pending" | "verified" | "rejected";

function getStatusFilter(value: string | null): StatusFilter {
  if (value === "pending" || value === "verified" || value === "rejected") return value;
  return "all";
}

function getRequestCountLabel(status: StatusFilter, total: number): string {
  const requestLabel = total === 1 ? "request" : "requests";
  if (status === "pending") return `${total} pending review`;
  if (status === "all") return `${total} total ${requestLabel}`;
  return `${total} ${status} ${requestLabel}`;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function IdentityStatusBadge({ status }: { status: AdminIdentityVerificationRecord["status"] }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    verified: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };
  const labels = {
    pending: "Pending",
    verified: "Verified",
    rejected: "Rejected",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function ApplicantIdentityVerificationPage() {
  const { token } = useAuth();
  const { refresh: refreshVerificationCounts } = useOutletContext<AdminOutletContext>();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<AdminIdentityVerificationRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    getStatusFilter(searchParams.get("status")),
  );
  const [query, setQuery] = useState(() => searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] =
    useState<AdminIdentityVerificationRecord | null>(null);
  const [details, setDetails] = useState<AdminIdentityVerificationDetails | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState("");
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const reviewRequestId = useRef(0);

  const load = useCallback(async (pageToLoad: number, status: StatusFilter) => {
    if (!token) {
      setError("Your admin session has expired. Sign in again to review applicants.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.applicantIdentityVerifications(
        token,
        status,
        pageToLoad,
      );
      setRecords(response.data);
      setPage(response.meta.current_page);
      setLastPage(response.meta.last_page);
      setTotal(response.meta.total);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load applicant identity-verification requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Load only after the filter changes; page changes are handled by pagination actions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1, statusFilter);
  }, [load, statusFilter]);

  useEffect(() => {
    if (!documentUrl) return;
    return () => URL.revokeObjectURL(documentUrl);
  }, [documentUrl]);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter((record) =>
      !search ||
      `${record.applicant.name} ${record.applicant.email}`.toLowerCase().includes(search),
    );
  }, [query, records]);

  function closeReview() {
    reviewRequestId.current += 1;
    setSelectedRecord(null);
    setDetails(null);
    setDocumentUrl(null);
    setDocumentMimeType("");
    setIsLoadingReview(false);
    setIsRejecting(false);
    setRejectionReason("");
    setReviewError(null);
  }

  async function openReview(record: AdminIdentityVerificationRecord) {
    if (!token) {
      setError("Your admin session has expired. Sign in again to review applicants.");
      return;
    }

    const requestId = reviewRequestId.current + 1;
    reviewRequestId.current = requestId;
    setSelectedRecord(record);
    setDetails(null);
    setDocumentUrl(null);
    setDocumentMimeType("");
    setIsRejecting(false);
    setRejectionReason("");
    setReviewError(null);
    setIsLoadingReview(true);
    try {
      const [detailResponse, document] = await Promise.all([
        adminApi.applicantIdentityVerification(token, record.id),
        adminApi.applicantIdentityVerificationDocument(token, record.id),
      ]);
      const url = URL.createObjectURL(document);
      if (reviewRequestId.current !== requestId) {
        URL.revokeObjectURL(url);
        return;
      }
      setDetails(detailResponse.data);
      setDocumentMimeType(document.type);
      setDocumentUrl(url);
    } catch (requestError) {
      if (reviewRequestId.current === requestId) {
        setReviewError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to securely load the applicant's identity document.",
        );
      }
    } finally {
      if (reviewRequestId.current === requestId) setIsLoadingReview(false);
    }
  }

  async function submitReview(status: "verified" | "rejected") {
    if (!token || !selectedRecord || isSaving) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      setReviewError("Provide a reason so the applicant knows what to correct.");
      return;
    }

    setReviewError(null);
    setIsSaving(true);
    try {
      await adminApi.reviewApplicantIdentityVerification(
        token,
        selectedRecord.id,
        status,
        status === "rejected" ? rejectionReason.trim() : undefined,
      );
      closeReview();
      await Promise.all([load(1, statusFilter), refreshVerificationCounts()]);
    } catch (requestError) {
      setReviewError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the identity-verification decision.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Applicant identity verification"
        subtitle="Review private selfie-with-ID submissions and manually approve or reject identity verification."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void load(page, statusFilter)}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <span className="inline-flex h-10 items-center rounded-xl border border-amber-100 bg-amber-50 px-4 text-xs font-semibold text-amber-700">
              {getRequestCountLabel(statusFilter, total)}
            </span>
          </div>
        }
      />

      <nav
        aria-label="Verification categories"
        className="mb-5 inline-flex flex-wrap gap-1 rounded-xl border border-[#e5eceb] bg-[#f7faf9] p-1"
      >
        <Link
          className="rounded-lg px-4 py-2 text-xs font-semibold text-[#687b7e] hover:bg-white hover:text-[#087879]"
          to="/admin/verifications"
        >
          Employer verification
        </Link>
        <Link
          aria-current="page"
          className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#087879] shadow-sm"
          to="/admin/applicant-verifications"
        >
          Applicant identity
        </Link>
      </nav>

      <div className="mb-4 flex flex-wrap gap-2.5 max-[680px]:flex-col">
        <SearchBar
          className="w-full sm:w-72 max-[680px]:w-full"
          value={query}
          onChange={setQuery}
          placeholder="Search applicants"
        />
        <Select
          ariaLabel="Filter applicant verification status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          options={STATUS_OPTIONS}
        />
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <span>{error}</span>
          <button
            className="font-semibold underline"
            onClick={() => void load(page, statusFilter)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <p aria-live="polite" className="py-10 text-center text-sm text-muted">
          Loading applicant identity-verification requests…
        </p>
      ) : filteredRecords.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted">
          {records.length === 0
            ? "No applicant identity requests match this status."
            : "No applicants match your search."}
        </Card>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredRecords.map((record) => {
            const initials = record.applicant.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0] ?? "")
              .join("")
              .toUpperCase();
            return (
              <Card
                className="grid min-h-[100px] items-center gap-4 px-5 py-4 md:grid-cols-[minmax(220px,1fr)_auto_auto]"
                key={record.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={initials} shape="square" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-ink">
                        {record.applicant.name}
                      </h2>
                      <IdentityStatusBadge status={record.status} />
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted">
                      {record.applicant.email}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      Submitted {formatDate(record.submitted_at)}
                    </p>
                  </div>
                </div>
                {record.rejection_reason && (
                  <p className="max-w-64 text-[10px] leading-4 text-red-700">
                    Reason: {record.rejection_reason}
                  </p>
                )}
                <Button
                  className="max-[680px]:w-full"
                  icon={<FileCheck2 size={14} />}
                  onClick={() => void openReview(record)}
                >
                  {record.status === "pending" ? "View documents & review" : "View decision"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && lastPage > 1 && (
        <div className="mt-5">
          <Pagination
            page={page}
            pageCount={lastPage}
            onPageChange={(nextPage) => void load(nextPage, statusFilter)}
            summary={getRequestCountLabel(statusFilter, total)}
          />
        </div>
      )}

      {selectedRecord && (
        <Modal
          title="Review applicant identity"
          subtitle={`${details?.applicant.name ?? selectedRecord.applicant.name} · Submitted ${formatDate(details?.submitted_at ?? selectedRecord.submitted_at)}`}
          onClose={closeReview}
          widthClass="max-w-4xl"
        >
          <div className="grid gap-5 p-6 md:grid-cols-[minmax(0,1.3fr)_minmax(240px,.7fr)] max-[680px]:p-4">
            <div className="min-h-[320px] overflow-hidden rounded-xl border border-line bg-canvas">
              {isLoadingReview ? (
                <div className="grid min-h-[320px] place-items-center text-sm text-muted" role="status">
                  Loading private identity document…
                </div>
              ) : documentUrl && documentMimeType === "application/pdf" ? (
                <iframe
                  className="h-[min(65dvh,620px)] w-full bg-white"
                  src={documentUrl}
                  title={`${selectedRecord.applicant.name} identity document`}
                />
              ) : documentUrl && documentMimeType.startsWith("image/") ? (
                <div className="grid min-h-[320px] place-items-center p-3">
                  <img
                    alt={`${selectedRecord.applicant.name} selfie with ID`}
                    className="max-h-[min(65dvh,620px)] max-w-full object-contain"
                    src={documentUrl}
                  />
                </div>
              ) : (
                <div className="grid min-h-[320px] place-items-center p-6 text-center text-sm text-muted">
                  {reviewError ?? "The identity document preview is unavailable."}
                </div>
              )}
            </div>

            <aside className="flex min-w-0 flex-col">
              <div className="rounded-xl border border-line bg-white p-4">
                <h3 className="text-sm font-semibold text-ink">Applicant details</h3>
                <dl className="mt-3 space-y-3 text-xs">
                  <div>
                    <dt className="text-muted">Name</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {details?.applicant.name ?? selectedRecord.applicant.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Email</dt>
                    <dd className="mt-0.5 break-all font-medium text-ink">
                      {details?.applicant.email ?? selectedRecord.applicant.email}
                    </dd>
                  </div>
                  {details?.applicant.city && (
                    <div>
                      <dt className="text-muted">City</dt>
                      <dd className="mt-0.5 font-medium text-ink">{details.applicant.city}</dd>
                    </div>
                  )}
                  {details?.applicant.phone && (
                    <div>
                      <dt className="text-muted">Phone</dt>
                      <dd className="mt-0.5 font-medium text-ink">{details.applicant.phone}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted">Status</dt>
                    <dd className="mt-1">
                      <IdentityStatusBadge status={selectedRecord.status} />
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Before approval, confirm the photo clearly shows this applicant&apos;s face beside their own valid ID.
              </p>

              {selectedRecord.status === "pending" ? (
                isRejecting ? (
                  <div className="mt-4 space-y-2">
                    <label className="block text-xs font-medium text-ink" htmlFor="identity-rejection-reason">
                      Reason for rejection
                    </label>
                    <textarea
                      className="min-h-24 w-full resize-y rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-50/80"
                      id="identity-rejection-reason"
                      maxLength={1000}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Explain what the applicant needs to correct."
                      value={rejectionReason}
                    />
                    <Button
                      aria-busy={isSaving}
                      className="w-full"
                      disabled={!rejectionReason.trim() || isSaving}
                      icon={isSaving
                        ? <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        : <X size={14} />}
                      onClick={() => void submitReview("rejected")}
                      variant="danger"
                    >
                      {isSaving ? "Saving…" : "Confirm rejection"}
                    </Button>
                    <Button
                      className="w-full"
                      disabled={isSaving}
                      onClick={() => setIsRejecting(false)}
                      variant="outline"
                    >
                      Back
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {(!documentUrl || !documentMimeType.startsWith("image/")) && (
                      <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900" role="status">
                        Approval requires a readable selfie image showing the applicant with their ID.
                      </p>
                    )}
                    <Button
                      aria-busy={isSaving}
                      className="w-full"
                      disabled={isLoadingReview || isSaving || !documentUrl || !documentMimeType.startsWith("image/")}
                      icon={isSaving
                        ? <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        : <Check size={14} />}
                      onClick={() => void submitReview("verified")}
                    >
                      {isSaving ? "Saving…" : "Approve selfie with ID"}
                    </Button>
                    <Button
                      className="w-full"
                      disabled={isLoadingReview || isSaving}
                      onClick={() => setIsRejecting(true)}
                      variant="danger"
                    >
                      Reject…
                    </Button>
                  </div>
                )
              ) : (
                <p className={`mt-4 rounded-lg p-3 text-xs leading-5 ${
                  selectedRecord.status === "verified"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-800"
                }`}>
                  {selectedRecord.status === "verified"
                    ? "This applicant's identity review was approved."
                    : `This request was rejected.${selectedRecord.rejection_reason ? ` Reason: ${selectedRecord.rejection_reason}` : ""}`}
                </p>
              )}

              {reviewError && (
                <p className="mt-3 text-xs text-red-700" role="alert">
                  {reviewError}
                </p>
              )}
            </aside>
          </div>
        </Modal>
      )}
    </section>
  );
}
