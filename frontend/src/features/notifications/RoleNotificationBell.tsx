import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { apiRequest } from "@/lib/axios";
import { useAuth } from "@/features/auth/useAuth";

type Role = "admin" | "employer" | "applicant";

type NotificationRecord = {
  id: string;
  event: string | null;
  title: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
};

function relativeTime(value: string | null): string {
  if (!value) return "Date unavailable";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return "Just now";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RoleNotificationBell({ role }: { role: Role }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => items.filter((item) => item.read_at === null).length, [items]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ data: NotificationRecord[] }>(
        "/notifications",
        { params: { per_page: 50 } },
        token,
      );
      setItems(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Initial loading is asynchronous and state updates occur after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  async function markAllRead() {
    if (!token) return;
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" }, token);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to mark notifications as read.");
    }
  }

  async function openNotification(item: NotificationRecord) {
    if (!token) return;
    setOpen(false);
    if (item.read_at === null) {
      await apiRequest(`/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH" }, token).catch(() => {});
    }

    if (role === "admin") {
      if (item.event?.includes("verification")) navigate("/admin/verifications");
      else if (item.event?.includes("listing")) navigate("/admin/job-listings");
      else navigate("/admin");
    } else if (role === "employer") {
      if (item.event?.startsWith("application") || item.event?.startsWith("interview")) navigate("/employer/applicants");
      else if (item.event?.startsWith("listing")) navigate("/employer/listings");
      else navigate("/employer/overview");
    } else {
      if (item.metadata.application_id || item.event?.startsWith("interview")) navigate("/applications");
      else navigate("/profile");
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-[#65787a] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
        onClick={() => setOpen((current) => !current)}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#d94a3d] px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <section className="absolute right-0 top-full z-[70] mt-2 flex max-h-[min(620px,calc(100dvh-5rem))] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_16px_40px_rgba(27,54,52,.18)]" role="dialog" aria-label="Notifications">
          <header className="flex items-center justify-between border-b border-[#edf1f1] px-5 py-4">
            <div><h2 className="text-sm font-bold text-[#263a3c]">Notifications</h2><p className="mt-0.5 text-xs text-[#829092]">{unreadCount ? `${unreadCount} unread` : "You’re all caught up"}</p></div>
            <button type="button" aria-label="Close notifications" className="grid size-9 place-items-center rounded-full text-xl text-[#687b7e]" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {error && <p className="p-5 text-sm text-red-700" role="alert">{error}</p>}
            {loading && items.length === 0 && <p className="p-5 text-sm text-muted">Loading notifications…</p>}
            {!loading && items.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#687b7e]">No notifications yet.</p>}
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`flex w-full gap-3 border-b border-[#f0f3f3] px-5 py-4 text-left hover:bg-[#f7fbfa] ${item.read_at ? "opacity-70" : "bg-[#fbfdfd]"}`}>
                <span className={`mt-1 size-2 shrink-0 rounded-full ${item.read_at ? "bg-[#b8c3c3]" : "bg-[#078b8d]"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#344749]">{item.title ?? "Notification"}</span><time className="shrink-0 text-[11px] text-[#829092]">{relativeTime(item.created_at)}</time></span>
                  <span className="mt-1 block text-xs leading-5 text-[#687b7e]">{item.message}</span>
                </span>
              </button>
            ))}
          </div>
          <footer className="border-t border-[#edf1f1] px-5 py-4">
            <button type="button" disabled={unreadCount === 0} className="text-xs font-semibold text-[#078b8d] disabled:opacity-50" onClick={() => void markAllRead()}>Mark all as read</button>
          </footer>
        </section>
      )}
    </div>
  );
}
