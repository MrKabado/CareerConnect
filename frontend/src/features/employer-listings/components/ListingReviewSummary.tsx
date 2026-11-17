import type { Dispatch, SetStateAction } from "react";
import EmployerOpportunityTypeBadge from "@/components/common/employer/EmployerOpportunityTypeBadge";
import {
  getStatusBadgeClasses,
  getStatusLabel,
} from "@/features/employer-listings/hooks/useEmployerListingReview";
import type { ReviewDraftValues } from "@/features/employer-listings/types";

type ListingReviewSummaryProps = {
  draft: ReviewDraftValues;
  setDraft: Dispatch<SetStateAction<ReviewDraftValues>>;
  status: "pending_confirmation" | "confirmed" | "needs_changes";
  companyName: string;
};

export default function ListingReviewSummary({
  draft,
  setDraft,
  status,
}: ListingReviewSummaryProps) {
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="w-full">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Listing title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              className="min-w-0 flex-1 rounded-xl border border-[#dfeae8] bg-[#f8fbfb] px-3 py-2 text-[18px] font-bold tracking-[-0.04em] text-[#1d3034] outline-none focus:border-[#b8dde0]"
            />
            <EmployerOpportunityTypeBadge>{draft.type}</EmployerOpportunityTypeBadge>
          </div>
          <input
            aria-label="Listing category"
            value={draft.category}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-[#dfeae8] bg-[#f8fbfb] px-3 py-2 text-[11px] text-[#697d7d] outline-none focus:border-[#b8dde0]"
          />
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClasses(status)}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="rounded-[14px] bg-[#f6faf9] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#678083]">
          <span className="block">Location</span>
          <input
            aria-label="Listing location"
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({ ...current, location: event.target.value }))
            }
            className="mt-2 w-full border-0 bg-transparent p-0 text-[12px] font-semibold text-[#1d3133] outline-none"
          />
        </label>
        <label className="rounded-[14px] bg-[#f6faf9] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#678083]">
          <span className="block">Department</span>
          <input
            aria-label="Listing department"
            value={draft.department}
            onChange={(event) =>
              setDraft((current) => ({ ...current, department: event.target.value }))
            }
            className="mt-2 w-full border-0 bg-transparent p-0 text-[12px] font-semibold text-[#1d3133] outline-none"
          />
        </label>
        <label className="rounded-[14px] bg-[#f6faf9] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#678083]">
          <span className="block">Schedule</span>
          <select
            aria-label="Listing schedule"
            value={draft.schedule}
            onChange={(event) =>
              setDraft((current) => ({ ...current, schedule: event.target.value }))
            }
            className="mt-2 w-full border-0 bg-transparent p-0 text-[12px] font-semibold text-[#1d3133] outline-none"
          >
            <option>Hybrid</option>
            <option>On-site</option>
            <option>Remote</option>
          </select>
        </label>
        <label className="rounded-[14px] bg-[#f6faf9] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#678083]">
          <span className="block">Type</span>
          <select
            aria-label="Listing hiring type"
            value={draft.type}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                type: event.target.value as "Job" | "OJT",
              }))
            }
            className="mt-2 w-full border-0 bg-transparent p-0 text-[12px] font-semibold text-[#1d3133] outline-none"
          >
            <option value="Job">Job</option>
            <option value="OJT">OJT</option>
          </select>
        </label>
      </div>
    </>
  );
}
