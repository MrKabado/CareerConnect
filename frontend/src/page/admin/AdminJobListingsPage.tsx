import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi } from "@/features/admin/backendApi";
import { PageHeader } from "@/components/common";
import Modal from "@/components/common/Modal";
import { subscribeToPublicJobListings } from "@/lib/realtime";

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

  useEffect(() => subscribeToPublicJobListings(() => {
    void load();
  }), [load]);

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

  const openOnPage = visible.filter((listing) => listing.status === "open").length;
  const applicantsOnPage = visible.reduce(
    (count, listing) => count + (listing.applications_count ?? listing.applicant_count ?? 0),
    0,
  );

  const statusStyles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    draft: "bg-slate-100 text-slate-700 ring-slate-600/10",
    closed: "bg-amber-50 text-amber-700 ring-amber-600/10",
    full: "bg-violet-50 text-violet-700 ring-violet-600/10",
    expired: "bg-orange-50 text-orange-700 ring-orange-600/10",
    deactivated: "bg-red-50 text-red-700 ring-red-600/10",
  };

  const formatDate = (value: string | null) => {
    if (!value) return "Unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Unavailable"
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <section>
      <PageHeader title="Job Listings" subtitle="Review and manage every employer job and OJT listing across the platform." />

      <div className="mb-5 grid grid-cols-3 gap-3 max-[680px]:grid-cols-1">
        {[
          { label: "Total listings", value: total, detail: "Across the platform", icon: BriefcaseBusiness, tone: "bg-brand-50 text-brand-700" },
          { label: "Open on this page", value: openOnPage, detail: "Accepting applications", icon: Building2, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Applicants on page", value: applicantsOnPage, detail: "Across listed opportunities", icon: UsersRound, tone: "bg-violet-50 text-violet-700" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white p-4 shadow-[0_8px_24px_rgba(29,49,51,.035)]" key={label}>
            <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-5" strokeWidth={1.8} /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted">{label}</p>
              <p className="mt-0.5 text-xl font-bold leading-none text-ink">{loading ? "—" : value}</p>
              <p className="mt-1 truncate text-[10px] text-muted/80">{detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-line/80 bg-white p-3 shadow-[0_8px_24px_rgba(29,49,51,.035)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-64 flex-1 max-[680px]:w-full max-[680px]:min-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8aa09f]" />
            <span className="sr-only">Search listings</span>
            <input
              className="h-10 w-full rounded-xl border border-[#dce6e4] bg-[#fbfdfd] pl-9 pr-3 text-sm text-ink placeholder:text-[#98a7a7] focus:border-brand-600 focus:bg-white focus:outline-none"
              placeholder="Search title, company, or employer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select className="h-10 min-w-32 rounded-xl border border-[#dce6e4] bg-white px-3 text-sm text-ink" value={listingType} onChange={(event) => { setListingType(event.target.value); setPage(1); }}>
            <option value="">All types</option><option value="job">Job</option><option value="ojt">OJT</option>
          </select>
          <select className="h-10 min-w-36 rounded-xl border border-[#dce6e4] bg-white px-3 text-sm text-ink" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option><option value="full">Full</option><option value="expired">Expired</option><option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_10px_30px_rgba(29,49,51,.045)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="border-b border-line bg-[#f7faf9] text-[10px] uppercase tracking-[0.07em] text-[#718181]">
              <tr>{["Job opportunity","Company","Type","Applicants","Status","Date posted","Action"].map((label) => <th className="px-4 py-3.5 font-semibold" key={label}>{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f1]">
              {loading ? (
                <tr><td className="px-4 py-14 text-center text-muted" colSpan={7}>
                  <span className="inline-flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />Loading listings…</span>
                </td></tr>
              ) : visible.map((listing) => {
                const companyName = listing.company?.name ?? "Unavailable";
                const initials = companyName === "Unavailable"
                  ? "?"
                  : companyName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                const applicants = listing.applications_count ?? listing.applicant_count ?? 0;
                return (
                  <tr className="group transition hover:bg-[#fbfdfd]" key={listing.id}>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[220px] truncate text-[13px] font-bold text-ink">{listing.title}</p>
                      <p className="mt-1 max-w-[220px] truncate text-[10px] text-muted">{listing.company?.employer?.name ?? "Employer unavailable"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eaf4f3] text-[10px] font-bold text-brand-700">{initials}</span>
                        <span className="max-w-[150px] truncate font-medium text-[#405657]">{companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-md bg-[#f1f5f4] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#5a7071]">
                        {listing.listing_type === "ojt" ? "OJT" : "Job"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#52696a]"><UsersRound className="size-3.5 text-[#91a19f]" />{applicants}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ring-1 ring-inset ${statusStyles[listing.status] ?? "bg-slate-100 text-slate-700 ring-slate-600/10"}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-[#657777]">{formatDate(listing.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button className="inline-flex size-8 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50" type="button" aria-label={`View ${listing.title}`} title="View listing" onClick={() => setViewed(listing)}><Eye className="size-4" /></button>
                        <button className="inline-flex size-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50" type="button" aria-label={`Delete ${listing.title}`} title="Delete listing" onClick={() => setDeleteTarget(listing)}><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && visible.length === 0 && <tr><td className="px-4 py-14 text-center" colSpan={7}><p className="font-semibold text-ink">No listings found</p><p className="mt-1 text-xs text-muted">Try adjusting your search or filters.</p></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fcfdfd] px-4 py-3 text-xs text-muted">
          <span><strong className="font-semibold text-ink">{total}</strong> listings · Page {page} of {lastPage}</span>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-3 font-semibold text-[#526365] transition hover:border-[#baccca] disabled:cursor-not-allowed disabled:opacity-45" disabled={page <= 1 || loading} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="size-3.5" />Previous</button>
            <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-3 font-semibold text-[#526365] transition hover:border-[#baccca] disabled:cursor-not-allowed disabled:opacity-45" disabled={page >= lastPage || loading} type="button" onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {viewed && (
        <Modal title={viewed.title} subtitle={`${viewed.company?.name ?? "Company unavailable"} · ${viewed.listing_type === "ojt" ? "OJT" : "Job"}`} onClose={() => setViewed(null)} widthClass="max-w-2xl">
          <dl className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            <div className="rounded-xl border border-[#edf2f1] bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Employer</dt><dd className="mt-1 text-sm font-semibold">{viewed.company?.employer?.name ?? "Unavailable"}</dd></div>
            <div className="rounded-xl border border-[#edf2f1] bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Status</dt><dd className="mt-1 text-sm font-semibold capitalize">{viewed.status}</dd></div>
            <div className="rounded-xl border border-[#edf2f1] bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Applicants</dt><dd className="mt-1 text-sm font-semibold">{viewed.applications_count ?? viewed.applicant_count ?? 0}</dd></div>
            <div className="rounded-xl border border-[#edf2f1] bg-[#f6faf9] p-3"><dt className="text-[10px] text-muted">Custom category</dt><dd className="mt-1 text-sm font-semibold">{viewed.custom_category_name ?? "Not applicable"}</dd></div>
            <div className="sm:col-span-2 flex justify-end"><button className="rounded-lg border border-line px-4 py-2 text-sm font-semibold" type="button" onClick={() => setViewed(null)}>Close</button></div>
          </dl>
        </Modal>
      )}
      {deleteTarget && (
        <Modal title="Delete job listing?" subtitle="This action removes the listing from platform views." onClose={() => !deleting && setDeleteTarget(null)} widthClass="max-w-md">
          <div className="px-6 pb-6">
            <p className="text-sm leading-6 text-[#5b7072]">Delete <strong>{deleteTarget.title}</strong>? Existing application history will be preserved where the database allows it.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border border-line px-4 py-2 text-sm font-semibold" disabled={deleting} type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={deleting} type="button" onClick={() => void deleteListing()}>{deleting ? "Deleting…" : "Delete listing"}</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
