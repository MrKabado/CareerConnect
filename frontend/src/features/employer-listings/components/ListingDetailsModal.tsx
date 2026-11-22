import Modal from "@/components/common/Modal";
import type { EmployerListing } from "@/features/employer-listings/listings";

export default function ListingDetailsModal({
  listing,
  onClose,
}: {
  listing: EmployerListing | null;
  onClose: () => void;
}) {
  if (!listing) return null;

  return (
    <Modal title={listing.title} subtitle={`${listing.category} · ${listing.type}`} onClose={onClose} widthClass="max-w-2xl">
      <div className="px-6 pb-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Company</dt><dd className="mt-1 text-sm font-semibold text-ink">{listing.companySlug}</dd></div>
          <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Location</dt><dd className="mt-1 text-sm font-semibold text-ink">{listing.location}</dd></div>
          <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Work setup</dt><dd className="mt-1 text-sm font-semibold text-ink">{listing.hiring.schedule}</dd></div>
          <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Status</dt><dd className="mt-1 text-sm font-semibold capitalize text-ink">{listing.status}</dd></div>
          <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Salary</dt><dd className="mt-1 text-sm font-semibold text-ink">{listing.salary}</dd></div>
          <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Applicants</dt><dd className="mt-1 text-sm font-semibold text-ink">{listing.applicants ?? 0}{listing.applicantLimit ? ` / ${listing.applicantLimit}` : ""}</dd></div>
        </dl>
        <section className="mt-4"><h3 className="text-xs font-semibold text-ink">Description</h3><p className="mt-2 text-sm leading-6 text-[#5b7072]">{listing.description}</p></section>
        {listing.responsibilities.length > 0 && <section className="mt-4"><h3 className="text-xs font-semibold text-ink">Responsibilities</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5b7072]">{listing.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {listing.requiredSkills?.length ? <section className="mt-4"><h3 className="text-xs font-semibold text-ink">Required skills</h3><div className="mt-2 flex flex-wrap gap-2">{listing.requiredSkills.map((skill) => <span className="rounded-full bg-[#eef7f6] px-2.5 py-1 text-xs text-[#397276]" key={skill}>{skill}</span>)}</div></section> : null}
        {listing.experienceRequirement && <p className="mt-4 text-sm text-[#5b7072]"><strong>Experience:</strong> {listing.experienceRequirement}</p>}
        <div className="mt-6 flex justify-end"><button className="rounded-lg border border-[#dfe8e7] px-4 py-2 text-sm font-semibold text-[#526365]" type="button" onClick={onClose}>Close</button></div>
      </div>
    </Modal>
  );
}
