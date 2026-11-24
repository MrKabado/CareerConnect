import { useCallback } from "react";
import { MapPin } from "lucide-react";
import Modal from "@/components/common/Modal";
import JobLocationMap from "@/components/features/jobsearch/JobLocationMap";
import { publicJobsApi } from "@/features/jobs/backendApi";
import type { JobListing } from "@/features/jobs/jobListings";

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function formatSalary(listing: JobListing): string | null {
  if (listing.salaryMin == null && listing.salaryMax == null) return null;
  if (listing.salaryMin != null && listing.salaryMax != null) {
    return `₱${listing.salaryMin.toLocaleString()}–₱${listing.salaryMax.toLocaleString()}`;
  }
  if (listing.salaryMin != null) return `From ₱${listing.salaryMin.toLocaleString()}`;
  if (listing.salaryMax != null) return `Up to ₱${listing.salaryMax.toLocaleString()}`;
  return null;
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  return (
    <div className="rounded-lg border border-[#e5eeeb] bg-[#f8fbfa] p-3">
      <dt className="text-xs font-medium text-[#718181]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#263638]">{value}</dd>
    </div>
  );
}

export default function JobDetailsModal({
  listing,
  onClose,
}: {
  listing: JobListing | null;
  onClose: () => void;
}) {
  const listingId = listing?.listingId;
  const resolveCoordinates = useCallback(async () => {
    if (listingId == null) return null;
    const resolved = await publicJobsApi.show(listingId);
    return { latitude: resolved.latitude, longitude: resolved.longitude };
  }, [listingId]);

  if (!listing) return null;

  const company = listing.company === "Company unavailable" ? null : listing.company;
  const category = listing.category === "Uncategorized" ? null : listing.category;
  const employmentType = listing.employmentType === "Not specified"
    ? null
    : listing.employmentType;
  const hasSalary = listing.salaryMin != null || listing.salaryMax != null;
  const postedAt = formatDate(listing.postedAt);
  const expiresAt = formatDate(listing.expiresAt);
  const address = listing.location.trim();
  const experienceRequirement = listing.experienceRequired
    ? listing.minimumExperienceYears != null
      ? `At least ${listing.minimumExperienceYears} ${listing.minimumExperienceYears === 1 ? "year" : "years"}`
      : "Experience required"
    : "No experience required";

  return (
    <Modal
      title={listing.title || "Job details"}
      subtitle={company ?? category ?? undefined}
      onClose={onClose}
      widthClass="max-w-3xl"
    >
      <div className="space-y-6 px-6 pb-6 max-[680px]:px-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Company" value={company} />
          <Detail label="Job category" value={category} />
          <Detail label="Employment type" value={employmentType} />
          <Detail label="Work setup" value={listing.arrangement || null} />
          {hasSalary && <Detail label="Salary range" value={formatSalary(listing)} />}
          <Detail
            label="Experience requirement"
            value={experienceRequirement}
          />
          <Detail label="Applicant limit" value={listing.applicantLimit} />
          <Detail label="Date posted" value={postedAt} />
          <Detail label="Application expiration" value={expiresAt} />
        </dl>

        <section>
          <h3 className="text-sm font-semibold text-[#263638]">Job location</h3>
          <div className="mt-3">
            <JobLocationMap
              latitude={listing.latitude}
              longitude={listing.longitude}
              address={address}
              resolveCoordinates={listingId == null ? undefined : resolveCoordinates}
            />
          </div>
          {address && (
            <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#526466]">
              <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#078B8D]" />
              <div>
                <p className="text-xs font-semibold text-[#263638]">Location address</p>
                <p>{address}</p>
              </div>
            </div>
          )}
        </section>

        {listing.description.trim() && (
          <section>
            <h3 className="text-sm font-semibold text-[#263638]">Job description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5b7072]">{listing.description}</p>
          </section>
        )}

        {listing.responsibilities?.some((item) => item.trim()) && (
          <section>
            <h3 className="text-sm font-semibold text-[#263638]">Responsibilities</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#5b7072]">
              {listing.responsibilities?.filter((item) => item.trim()).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {listing.requirementsText.trim() && (
          <section>
            <h3 className="text-sm font-semibold text-[#263638]">Qualifications and requirements</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5b7072]">{listing.requirementsText}</p>
          </section>
        )}

        {listing.requiredSkills.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-[#263638]">Required skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.requiredSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-[#eef7f6] px-3 py-1.5 text-xs font-medium text-[#397276]">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
