import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi } from "@/features/admin/backendApi";
import { PageHeader } from "@/components/common";

type Listing = Awaited<ReturnType<typeof adminApi.jobs>>["data"][number];

export default function JobListingApprovalsPage() {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.jobs(token, { approval_status: "pending" });
      setListings(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load listings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Initial loading is triggered from the route effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function approve(id: number) {
    if (!token) return;
    setActingId(id);
    setError(null);
    try {
      await adminApi.approveJobCategory(token, id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to approve this listing.");
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: number) {
    if (!token) return;
    const reason = rejectReason[id]?.trim();
    if (!reason) {
      setError("Enter a rejection reason.");
      return;
    }
    setActingId(id);
    setError(null);
    try {
      await adminApi.rejectJobCategory(token, id, reason);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reject this listing.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section>
      <PageHeader title="Job listing approvals" subtitle="Review listings with custom categories." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading pending listings…</p>
      ) : listings.length === 0 ? (
        <p className="rounded-xl border border-line bg-white px-5 py-10 text-center text-sm text-muted">No job listings are awaiting category approval.</p>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <article className="rounded-xl border border-line bg-white p-4" key={listing.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{listing.title}</p>
                  <p className="mt-1 text-xs text-muted">{listing.company?.name ?? "Company unavailable"} · {listing.custom_category_name ?? "Custom category"}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Approval pending</span>
              </div>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-semibold text-muted">Rejection reason (required to reject)</span>
                <input
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  onChange={(event) => setRejectReason((current) => ({ ...current, [listing.id]: event.target.value }))}
                  value={rejectReason[listing.id] ?? ""}
                />
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" disabled={actingId === listing.id} onClick={() => void reject(listing.id)} type="button">Reject</button>
                <button className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" disabled={actingId === listing.id} onClick={() => void approve(listing.id)} type="button">Approve category</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
