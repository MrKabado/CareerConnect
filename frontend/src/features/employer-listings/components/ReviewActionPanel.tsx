import { formatTimestamp } from "@/features/employer-listings/hooks/useEmployerListingReview";
import type { ListingOnboarding, OnboardingStatus } from "@/features/employer-listings/types";

type ReviewActionPanelProps = {
  alertMessage: string | null;
  error: string | null;
  status: OnboardingStatus;
  record: ListingOnboarding | null;
  companyName: string;
  confirmationSummary: string | null;
  canPublish: boolean;
  isPublished: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onRetry: () => void;
  onPublish: () => void;
};

export default function ReviewActionPanel({
  alertMessage,
  error,
  status,
  record,
  companyName,
  confirmationSummary,
  canPublish,
  isPublished,
  isLoading,
  onConfirm,
  onRetry,
  onPublish,
}: ReviewActionPanelProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-[#edf2f0] pt-4">
      {alertMessage ? (
        <div
          aria-live="polite"
          role="status"
          className="rounded-xl border border-[#d7efe7] bg-[#eefaf5] px-3 py-2 text-[11px] font-medium text-[#1a7d62]"
        >
          {alertMessage}
        </div>
      ) : null}

      {error ? (
        <div
          aria-live="assertive"
          role="alert"
          className="rounded-xl border border-[#f2d7d7] bg-[#fff1f1] px-3 py-2 text-[11px] text-[#915a5a]"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg border border-[#e7c7c7] bg-white px-2.5 py-1 font-semibold text-[#8f4f4f] transition hover:border-[#d9abab]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "confirmed" && record ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6f0e2] bg-[#edfaf4] px-3 py-2 text-[11px] text-[#1a7d62]">
          <span className="inline-flex items-center rounded-full bg-[#dbf5e7] px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-[#1d9d75]">
            Confirmed
          </span>
          <span>
            {confirmationSummary ??
              `Confirmed by ${record.confirmedBy ?? companyName} on ${formatTimestamp(record.confirmedAt)}`}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {status === "confirmed" ? (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-[#dfece6] px-4 py-2.5 text-sm font-semibold text-[#46716a]"
            disabled
          >
            Confirmed
          </button>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Confirming..." : "Confirm onboarding"}
          </button>
        )}
      </div>

      <div className="rounded-[14px] border border-[#dfeae8] bg-[#f7fbfb] p-3">
        <div className="flex items-center justify-between gap-3 text-[11px] text-[#5f6f70]">
          <span>Last updated</span>
          <span>
            {formatTimestamp(record?.updatedAt ?? new Date().toISOString())} by {record?.confirmedBy ?? companyName}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#5f6f70]">
          <span>Publishing status</span>
          <span className={canPublish ? "font-semibold text-[#1a7d62]" : "font-semibold text-[#8b4a4a]"}>
            {canPublish ? "Eligible" : "Blocked"}
          </span>
        </div>
        {!canPublish ? (
          <p className="mt-3 text-[10px] text-[#8b4a4a]">Confirm onboarding before publishing</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onPublish}
        disabled={!canPublish}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a] disabled:cursor-not-allowed disabled:bg-[#c7dfe2] disabled:text-[#6d8589]"
      >
        {isPublished ? "Published" : canPublish ? "Publish listing" : "Confirm onboarding before publishing"}
      </button>
    </div>
  );
}
