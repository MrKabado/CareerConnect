import { useCallback } from "react";
import Modal from "@/components/common/Modal";
import JobLocationMap from "@/components/features/jobsearch/JobLocationMap";
import { useAuth } from "@/features/auth/useAuth";
import { employerListingsApi } from "@/features/employer-listings/backendApi";
import StatusPill from "@/features/employer-listings/components/StatusPill";
import type { EmployerListing } from "@/features/employer-listings/listings";

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function formatWorkSetup(value: EmployerListing["workSetup"]): string | null {
  if (value === "onsite") return "On-site";
  if (value === "hybrid") return "Hybrid";
  if (value === "remote") return "Remote";
  return null;
}

function formatEmploymentType(value: EmployerListing["employmentType"]): string | null {
  if (value === "full_time") return "Full-time";
  if (value === "part_time") return "Part-time";
  if (value === "contract") return "Contract";
  return null;
}

function formatSalaryRange(listing: EmployerListing): string | null {
  const minimum = listing.salaryMin;
  const maximum = listing.salaryMax;
  if (minimum == null && maximum == null) return null;
  if (minimum != null && maximum != null) {
    return `₱${minimum.toLocaleString()}–₱${maximum.toLocaleString()}`;
  }
  return minimum != null
    ? `From ₱${minimum.toLocaleString()}`
    : `Up to ₱${maximum?.toLocaleString()}`;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  return (
    <div className="rounded-xl border border-[#e5eeeb] bg-[#f8fbfa] p-3">
      <dt className="text-xs font-medium text-[#718181]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#263638]">{value}</dd>
    </div>
  );
}

export default function ListingDetailsModal({
  listing,
  onClose,
  onEdit,
  onStatusChange,
  error,
  isSaving,
}: {
  listing: EmployerListing | null;
  onClose: () => void;
  onEdit: (listing: EmployerListing) => void;
  onStatusChange: (id: string, status: "draft" | "open" | "closed") => void;
  error?: string | null;
  isSaving?: boolean;
}) {
  const { token } = useAuth();
  const listingId = listing ? Number(listing.id) : null;
  const resolveCoordinates = useCallback(async () => {
    if (!token || listingId == null || !Number.isInteger(listingId)) return null;
    const resolved = await employerListingsApi.show(token, listingId);
    return { latitude: resolved.data.latitude, longitude: resolved.data.longitude };
  }, [listingId, token]);

  if (!listing) return null;

  const requirements = listing.requirements?.filter((item) => item.trim()) ?? [];
  const requiredSkills = listing.requiredSkills?.filter((skill) => skill.trim()) ?? [];
  const acceptedCourses = listing.acceptedCourses?.filter((course) => course.trim()) ?? [];
  const datePosted = formatDate(listing.postedAt);
  const expiresAt = formatDate(listing.expiresAt);
  const updatedAt = formatDate(listing.updatedAt);
  const experience = listing.type !== "Job"
    ? null
    : listing.experienceRequired === true
      ? listing.minimumExperienceYears != null
        ? `${listing.minimumExperienceYears} ${listing.minimumExperienceYears === 1 ? "year" : "years"}`
        : "Experience required"
      : listing.experienceRequired === false
        ? "No experience required"
        : null;
  const allowance = listing.ojtAllowanceType === "unpaid"
    ? "Unpaid"
    : listing.ojtAllowanceType === "paid"
      ? listing.ojtAllowanceAmount != null
        ? `₱${listing.ojtAllowanceAmount.toLocaleString()}`
        : "Paid"
      : null;
  const hasOjtDetails = listing.type === "OJT" && (
    listing.ojtDurationHours != null
    || allowance != null
    || listing.ojtSlots != null
    || acceptedCourses.length > 0
    || listing.moaAccepted != null
  );
  const hasDescription = Boolean(listing.description.trim());
  const hasResponsibilities = listing.responsibilities.some((item) => item.trim());
  const hasOtherDetails = Boolean(
    listing.category
    || listing.location
    || formatWorkSetup(listing.workSetup)
    || formatEmploymentType(listing.employmentType)
    || formatSalaryRange(listing)
    || experience
    || listing.applicantLimit != null
    || expiresAt
    || datePosted
    || updatedAt
    || requirements.length
    || requiredSkills.length
    || hasOjtDetails
    || (listing.approvalStatus && listing.approvalStatus !== "not_required"),
  );
  const statusActionDisabled = isSaving
    || ["deactivated", "full", "expired"].includes(listing.status);
  const statusActionLabel = listing.status === "active"
    ? "Close listing"
    : listing.status === "draft"
      ? "Publish listing"
      : listing.status === "deactivated"
        ? "Listing deactivated"
        : listing.status === "full"
          ? "Listing full"
          : listing.status === "expired"
            ? "Listing expired"
            : "Reopen listing";

  return (
    <Modal
      title={listing.title || "Listing details"}
      subtitle={listing.category || listing.type}
      onClose={onClose}
      widthClass="max-w-3xl"
    >
      <div className="px-6 pb-6 max-[680px]:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eeeb] pb-4">
          <div className="flex items-center gap-2">
            <StatusPill status={listing.status} />
            <span className="text-xs font-medium text-[#687c7e]">{listing.type}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {hasOtherDetails && (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailField label="Job category" value={listing.category} />
            <DetailField label="Employment type" value={formatEmploymentType(listing.employmentType)} />
            <DetailField label="Work setup" value={formatWorkSetup(listing.workSetup)} />
            <DetailField label="Location" value={listing.location} />
            <DetailField label={listing.type === "OJT" ? "Allowance" : "Salary range"} value={listing.type === "OJT" ? allowance : formatSalaryRange(listing)} />
            <DetailField label="Experience requirement" value={experience} />
            <DetailField label="Applicant limit" value={listing.applicantLimit} />
            <DetailField label="Application expiration" value={expiresAt} />
            <DetailField label="Date posted" value={datePosted} />
            <DetailField label="Last updated" value={updatedAt} />
          </dl>
        )}

        {listing.location && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-[#263638]">Workplace map</h3>
            <div className="mt-3">
              <JobLocationMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                address={listing.location}
                resolveCoordinates={token && Number.isInteger(listingId) ? resolveCoordinates : undefined}
              />
            </div>
          </section>
        )}

        {hasDescription && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-[#263638]">Job description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5b7072]">{listing.description}</p>
          </section>
        )}

        {hasResponsibilities && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-[#263638]">Responsibilities</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#5b7072]">
              {listing.responsibilities.filter((item) => item.trim()).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {requirements.length > 0 && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-[#263638]">Qualifications and requirements</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#5b7072]">
              {requirements.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
            </ul>
          </section>
        )}

        {requiredSkills.length > 0 && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-[#263638]">Required skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {requiredSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-[#eef7f6] px-3 py-1.5 text-xs font-medium text-[#397276]">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {hasOjtDetails && (
          <section className="mt-5 rounded-xl border border-[#dcebea] bg-[#f6faf9] p-4">
            <h3 className="text-sm font-semibold text-[#263638]">OJT details</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailField label="Required hours" value={listing.ojtDurationHours} />
              <DetailField label="Available slots" value={listing.ojtSlots} />
              {acceptedCourses.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-[#718181]">Accepted courses</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#263638]">{acceptedCourses.join(", ")}</dd>
                </div>
              ) : null}
              {listing.moaAccepted != null && (
                <DetailField label="MOA accepted" value={listing.moaAccepted ? "Yes" : "No"} />
              )}
            </dl>
          </section>
        )}

        {!hasOtherDetails && !hasDescription && !hasResponsibilities && !requirements.length && !requiredSkills.length && !hasOjtDetails && (
          <p className="mt-5 rounded-xl bg-[#f8fbfa] px-4 py-6 text-center text-sm text-[#718181]">
            No additional listing details are available.
          </p>
        )}

        {listing.approvalStatus && listing.approvalStatus !== "not_required" && (
          <section className="mt-5 rounded-xl border border-[#e5eeeb] bg-[#fbfdfd] p-4">
            <h3 className="text-sm font-semibold text-[#263638]">Custom category approval</h3>
            <p className="mt-1 text-sm text-[#5b7072]">
              {listing.approvalStatus === "pending"
                ? "Awaiting admin approval"
                : listing.approvalStatus === "approved"
                  ? "Approved"
                  : "Rejected"}
            </p>
            {listing.approvalReason && <p className="mt-1 text-sm text-[#a2534c]">{listing.approvalReason}</p>}
          </section>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#e5eeeb] pt-4">
          {listing.status !== "deactivated" && (
            <button
              className="rounded-lg border border-[#078B8D] px-4 py-2 text-sm font-semibold text-[#078B8D] transition hover:bg-[#f1f8f7]"
              disabled={isSaving}
              type="button"
              onClick={() => onEdit(listing)}
            >
              Edit listing
            </button>
          )}
          <button
            className="rounded-lg bg-[#078B8D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#067678] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={statusActionDisabled}
            type="button"
            onClick={() => onStatusChange(listing.id, listing.status === "active" ? "closed" : "open")}
          >
            {statusActionLabel}
          </button>
          <button
            className="rounded-lg border border-[#dfe8e7] px-4 py-2 text-sm font-semibold text-[#526365]"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
