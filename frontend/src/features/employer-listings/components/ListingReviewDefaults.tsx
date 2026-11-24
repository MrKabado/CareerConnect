import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router";
import type { ReviewDraftValues } from "@/features/employer-listings/types";

type ListingReviewDefaultsProps = {
  companyName: string;
  draft: ReviewDraftValues;
  setDraft: Dispatch<SetStateAction<ReviewDraftValues>>;
  listingId: string;
};

export default function ListingReviewDefaults({
  companyName,
  draft,
  setDraft,
  listingId,
}: ListingReviewDefaultsProps) {
  return (
    <div className="rounded-[16px] border border-[#dfeae9] bg-[#edf5f4] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d7071]">
          {companyName} hiring defaults
        </p>
        <Link
          to="/employer/hiring-setup"
          state={{ listingId, returnTo: "/employer/listings/review" }}
          className="text-[10px] font-semibold text-[#0d8fa2] transition hover:underline"
        >
          Edit hiring setup
        </Link>
      </div>

      <label className="mt-4 block text-[11px] font-medium text-[#4d6264]">
        <span className="mb-1 block">School partnerships</span>
        <textarea
          aria-label="School partnerships"
          value={draft.schoolPartnerships}
          onChange={(event) =>
            setDraft((current) => ({ ...current, schoolPartnerships: event.target.value }))
          }
          rows={3}
          className="w-full resize-none rounded-xl border border-[#dfeae8] bg-[#f8fbfb] px-3 py-2.5 text-[11px] leading-5 text-[#4a5d5f] outline-none focus:border-[#b8dde0]"
        />
      </label>

      <label className="mt-4 block text-[11px] font-medium text-[#4d6264]">
        <span className="mb-1 block">Accepted courses</span>
        <input
          aria-label="Accepted courses"
          value={draft.acceptedCourses}
          onChange={(event) =>
            setDraft((current) => ({ ...current, acceptedCourses: event.target.value }))
          }
          className="w-full rounded-xl border border-[#dfeae8] bg-[#f8fbfb] px-3 py-2.5 text-[11px] text-[#4a5d5f] outline-none focus:border-[#b8dde0]"
        />
      </label>

      <div className="mt-4 space-y-2 text-[11px] text-[#4d6264]">
        <div className="flex items-center justify-between gap-2">
          <span>Hiring for</span>
          <span className="font-medium text-[#1d3133]">{draft.type}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Default workspace</span>
          <input
            aria-label="Default workspace"
            value={draft.workspace}
            onChange={(event) =>
              setDraft((current) => ({ ...current, workspace: event.target.value }))
            }
            className="max-w-[160px] border-0 bg-transparent p-0 text-right text-[11px] font-medium text-[#1d3133] outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>School partnerships</span>
          <span className="font-medium text-[#1d3133]">Open</span>
        </div>
      </div>
    </div>
  );
}
