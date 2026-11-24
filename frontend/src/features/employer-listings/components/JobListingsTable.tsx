import { useState } from "react";
import EmployerOpportunityTypeBadge from "@/components/common/employer/EmployerOpportunityTypeBadge";
import type { EmployerListing } from "@/features/employer-listings/listings";
import StatusPill from "@/features/employer-listings/components/StatusPill";

const listingsPerPage = 5;

type JobListingsBoardProps = {
  listings: EmployerListing[];
  onView: (listing: EmployerListing) => void;
};

export default function JobListingsBoard({ listings, onView }: JobListingsBoardProps) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(listings.length / listingsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageListings = listings.slice(
    (currentPage - 1) * listingsPerPage,
    currentPage * listingsPerPage,
  );
  return (
    <section>
      <div className="overflow-hidden rounded-[20px] border border-[#e5eeeb] bg-white shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
        <div className="max-h-[min(60vh,560px)] overflow-y-auto overscroll-contain divide-y divide-[#e7efee] rounded-b-[22px] [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          {pageListings.map((listing) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => onView(listing)}
              aria-label={`View details for ${listing.title || "job listing"}`}
              className="block w-full px-4 py-4 text-left transition hover:bg-[#f8fbfa] focus-visible:outline-2 focus-visible:outline-[#078B8D]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#dfeef0] text-[10px] font-bold text-[#2a5361]">
                    {listing.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-[#1d3034]">{listing.title}</h3>
                      <EmployerOpportunityTypeBadge>{listing.type}</EmployerOpportunityTypeBadge>
                    </div>
                    <p className="mt-1 text-[11px] text-[#6c7d7d]">{listing.category}</p>
                    <p className="mt-1 text-[11px] text-[#7a8c8d]">{listing.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:pt-1">
                  <StatusPill status={listing.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t border-[#eef2f1] pt-3 text-[11px] text-[#64797b] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {listing.applicants !== undefined && <span>{listing.applicants} applicants</span>}
                  {listing.shortlisted !== undefined && <span>{listing.shortlisted} shortlisted</span>}
                </div>
                <span className="inline-flex items-center justify-center rounded-full border border-[#dbe7e6] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0c808d]">
                  View details
                </span>
              </div>
            </button>
          ))}
          {pageListings.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[#738385]">No listings match this filter.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7efee] px-4 py-3">
          <p className="text-xs text-[#738385]" aria-live="polite">
            Showing {listings.length === 0 ? 0 : (currentPage - 1) * listingsPerPage + 1}–{Math.min(currentPage * listingsPerPage, listings.length)} of {listings.length}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous listings page"
                className="rounded-lg border border-[#dfe8e7] px-3 py-1.5 text-xs font-semibold text-[#526365] transition hover:bg-[#f1f8f7] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span className="min-w-16 text-center text-xs text-[#526365]" aria-label={`Page ${currentPage} of ${pageCount}`}>
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                aria-label="Next listings page"
                className="rounded-lg border border-[#dfe8e7] px-3 py-1.5 text-xs font-semibold text-[#526365] transition hover:bg-[#f1f8f7] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
