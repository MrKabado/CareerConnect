import { Link } from "react-router";
import EmployerOpportunityTypeBadge from "@/components/common/employer/EmployerOpportunityTypeBadge";
import type { EmployerListing } from "@/features/employer-listings/listings";
import StatusPill from "@/features/employer-listings/components/StatusPill";

type JobListingsBoardProps = {
  listings: EmployerListing[];
  selectedId: string;
  setSelectedId: (value: string) => void;
};

export default function JobListingsBoard({ listings, selectedId, setSelectedId }: JobListingsBoardProps) {
  const selectedListing = listings.find((listing) => listing.id === selectedId) ?? null;

  return (
    <section
      className={`grid gap-4 ${selectedListing ? "xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]" : ""}`}
    >
      <div className="overflow-hidden rounded-[20px] border border-[#e5eeeb] bg-white shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
        <div className="divide-y divide-[#e7efee] rounded-b-[22px]">
          {listings.map((listing) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => setSelectedId(listing.id)}
              className={`block w-full px-4 py-4 text-left transition ${selectedId === listing.id ? "bg-[#f4fbfa]" : "bg-white hover:bg-[#f8fbfa]"}`}
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
                  <span>{listing.applicants} applicants</span>
                  <span>{listing.shortlisted} shortlisted</span>
                </div>
                <span className="inline-flex items-center justify-center rounded-full border border-[#dbe7e6] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0c808d]">
                  View details
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedListing && (
        <aside className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <EmployerOpportunityTypeBadge>{selectedListing.type}</EmployerOpportunityTypeBadge>
            </div>
            <span className="text-[11px] text-[#738285]">{selectedListing.updated}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold tracking-[-0.05em] text-[#1e3135]">{selectedListing.title}</h3>
              <p className="mt-1 text-[11px] text-[#697d7d]">{selectedListing.category}</p>
            </div>
            <StatusPill status={selectedListing.status} />
          </div>
          <div className="mt-4 grid gap-2 text-[11px] text-[#5f6f70]">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf9] px-3 py-2">
              <span>Location</span>
              <span className="font-medium text-[#1d3133]">{selectedListing.location}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf9] px-3 py-2">
              <span>Schedule</span>
              <span className="font-medium text-[#1d3133]">{selectedListing.hiring.schedule}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf9] px-3 py-2">
              <span>Type</span>
              <EmployerOpportunityTypeBadge>{selectedListing.hiring.type}</EmployerOpportunityTypeBadge>
            </div>
          </div>
          <div className="mt-5 rounded-[16px] border border-[#e5eeeb] bg-[#fbfdfd] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62777a]">About this role</p>
            <p className="mt-3 text-[12px] leading-5 text-[#495e60]">{selectedListing.description}</p>
            <ul className="mt-4 space-y-2 text-[11px] leading-5 text-[#4d6366]">
              {selectedListing.responsibilities.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0f909f]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 rounded-[16px] border border-[#dfeae9] bg-[#edf5f4] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d7071]">Maya hiring defaults</p>
            <p className="mt-3 text-[11px] leading-5 text-[#4a5d5f]">{selectedListing.hiring.schoolPartnerships}</p>
            <div className="mt-4 space-y-2 text-[11px] text-[#4d6264]">
              <div className="flex items-center justify-between gap-2">
                <span>Hiring for</span>
                <EmployerOpportunityTypeBadge>{selectedListing.type}</EmployerOpportunityTypeBadge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Default workspace</span>
                <span className="font-medium text-[#1d3133]">{selectedListing.hiring.workspace}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>School partnerships</span>
                <span className="font-medium text-[#1d3133]">Open</span>
              </div>
            </div>
          </div>
          <Link
            to="/employer/listings/review"
            state={{ listing: selectedListing }}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]"
          >
            Review onboarding
          </Link>
        </aside>
      )}
    </section>
  );
}
