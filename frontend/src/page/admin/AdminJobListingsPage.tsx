import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi } from "@/features/admin/backendApi";
import { PageHeader } from "@/components/common";
import Modal from "@/components/common/Modal";

type Listing = Awaited<ReturnType<typeof adminApi.jobs>>["data"][number];

export default function AdminJobListingsPage() {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewed, setViewed] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.jobs(token, {
        page,
        ...(listingType ? { listing_type: listingType as "job" | "ojt" } : {}),
        ...(status ? { status } : {}),
        ...(search.trim() ? { keyword: search.trim() } : {}),
      });
      setListings(response.data);
      setLastPage(response.meta.last_page);
      setTotal(response.meta.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load job listings.");
    } finally {
      setLoading(false);
    }
  }, [listingType, page, search, status, token]);

  useEffect(() => {
    // Route load is asynchronous and updates state after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function deleteListing() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await adminApi.deleteJob(token, deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete listing.");
    } finally {
      setDeleting(false);
    }
  }

  const visible = listings.filter((listing) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || `${listing.title} ${listing.company?.name ?? ""} ${listing.company?.employer?.name ?? ""}`.toLowerCase().includes(query);
    const matchesType = !listingType || listing.listing_type === listingType;
    const matchesStatus = !status || listing.status === status;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <section>
      <PageHeader title="Job Listings" subtitle="All employer Job and OJT listings across the platform." />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="min-w-52 rounded-lg border border-line px-3 py-2 text-sm" placeholder="Search title, company, or employer" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={listingType} onChange={(event) => { setListingType(event.target.value); setPage(1); }}>
          <option value="">All types</option><option value="job">Job</option><option value="ojt">OJT</option>
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option><option value="full">Full</option><option value="expired">Expired</option><option value="deactivated">Deactivated</option>
        </select>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-line bg-[#f8fbfb] text-muted"><tr>{["Job Title","Company","Employer","Type","Applicants","Status","Date Posted","Action"].map((label) => <th className="px-4 py-3 font-semibold" key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td className="px-4 py-10 text-center text-muted" colSpan={8}>Loading listings…</td></tr> : visible.map((listing) => (
              <tr className="border-b border-line last:border-0" key={listing.id}>
                <td className="px-4 py-3 font-semibold text-ink">{listing.title}</td>
                <td className="px-4 py-3">{listing.company?.name ?? "Unavailable"}</td>
                <td className="px-4 py-3">{listing.company?.employer?.name ?? "Unavailable"}</td>
                <td className="px-4 py-3">{listing.listing_type === "ojt" ? "OJT" : "Job"}</td>
                <td className="px-4 py-3">{listing.applications_count ?? listing.applicant_count ?? 0}</td>
                <td className="px-4 py-3 capitalize">{listing.status}</td>
                <td className="px-4 py-3">{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : "Unavailable"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="font-semibold text-brand-700" type="button" onClick={() => setViewed(listing)}>View</button>
                    <button className="font-semibold text-red-700" type="button" onClick={() => setDeleteTarget(listing)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && <tr><td className="px-4 py-10 text-center text-muted" colSpan={8}>No listings match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{total} listings · Page {page} of {lastPage}</span>
        <div className="flex gap-2">
          <button className="rounded-lg border border-line px-3 py-2" disabled={page <= 1 || loading} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <button className="rounded-lg border border-line px-3 py-2" disabled={page >= lastPage || loading} type="button" onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
        {viewed && (
          <Modal title={viewed.title} subtitle={`${viewed.company?.name ?? "Company unavailable"} · ${viewed.listing_type === "ojt" ? "OJT" : "Job"}`} onClose={() => setViewed(null)} widthClass="max-w-2xl">
            <dl className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
              <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Employer</dt><dd className="mt-1 text-sm font-semibold">{viewed.company?.employer?.name ?? "Unavailable"}</dd></div>
              <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Status</dt><dd className="mt-1 text-sm font-semibold capitalize">{viewed.status}</dd></div>
              <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Applicants</dt><dd className="mt-1 text-sm font-semibold">{viewed.applications_count ?? viewed.applicant_count ?? 0}</dd></div>
              <div className="rounded-lg bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Custom category</dt><dd className="mt-1 text-sm font-semibold">{viewed.custom_category_name ?? "Not applicable"}</dd></div>
              <div className="sm:col-span-2 flex justify-end"><button className="rounded-lg border border-line px-4 py-2 text-sm font-semibold" type="button" onClick={() => setViewed(null)}>Close</button></div>
            </dl>
          </Modal>
        )}
        {deleteTarget && (
          <Modal title="Delete job listing?" subtitle="This action safely removes the listing from platform views." onClose={() => !deleting && setDeleteTarget(null)} widthClass="max-w-md">
            <div className="px-6 pb-6">
              <p className="text-sm leading-6 text-[#5b7072]">Delete <strong>{deleteTarget.title}</strong>? Existing application history will be preserved where the database allows it.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button className="rounded-lg border border-line px-4 py-2 text-sm font-semibold" disabled={deleting} type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={deleting} type="button" onClick={() => void deleteListing()}>{deleting ? "Deleting…" : "Delete listing"}</button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
}
