import { Link } from "react-router";
import type { NotificationItem } from "@/features/messaging/types";

function relativeTime(value: string): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return "Just now";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  if (elapsedSeconds < 604800) return `${Math.floor(elapsedSeconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type NotificationFeedProps = {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  onMarkAllRead: () => void;
  onClose: () => void;
};

export default function NotificationFeed({
  items,
  loading,
  error,
  onMarkAllRead,
  onClose,
}: NotificationFeedProps) {
  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <section
      aria-label="Notifications"
      className="absolute top-full right-0 z-50 mt-2 flex max-h-[min(620px,calc(100dvh-5rem))] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_16px_40px_rgba(27,54,52,0.18)] max-[680px]:fixed max-[680px]:inset-0 max-[680px]:z-[70] max-[680px]:mt-0 max-[680px]:h-dvh max-[680px]:max-h-none max-[680px]:w-full max-[680px]:max-w-none max-[680px]:rounded-none"
      role="dialog"
    >
      <header className="flex items-center justify-between border-b border-[#edf1f1] px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-[#263a3c]">Notifications</h2>
          <p className="mt-0.5 text-xs text-[#829092]">
            {unreadCount ? `${unreadCount} unread` : "You’re all caught up"}
          </p>
        </div>
        <button
          aria-label="Close notifications"
          className="grid size-9 place-items-center rounded-full text-xl text-[#687b7e] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="p-5 text-sm text-[#a2534c]" role="alert">{error}</p>}
        {!error && loading && <p className="p-5 text-sm text-[#687b7e]">Loading notifications…</p>}
        {!error && !loading && items.length === 0 && (
          <p className="px-6 py-10 text-center text-sm leading-6 text-[#687b7e]">
            No messages yet. Employers who review your application will contact you here.
          </p>
        )}
        {!error && !loading && items.map((item) => (
          <Link
            className="flex gap-3 border-b border-[#f0f3f3] px-5 py-4 transition hover:bg-[#f7fbfa] focus-visible:outline-[3px] focus-visible:outline-inset focus-visible:outline-[#67c9c1]"
            key={item.id}
            onClick={onClose}
            to={`/messages/${encodeURIComponent(item.conversationId)}`}
          >
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6f4f0] text-sm font-bold text-[#087879]"
            >
              {item.companyInitial || item.employerName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[#344749]">{item.employerName}</span>
                <time className="shrink-0 text-[11px] text-[#829092]" dateTime={item.createdAt}>
                  {relativeTime(item.createdAt)}
                </time>
              </span>
              <span className="mt-0.5 block truncate text-xs text-[#687b7e]">{item.role}</span>
              <span className="mt-1 block truncate text-xs text-[#829092]">{item.preview}</span>
            </span>
            {!item.read && (
              <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-[#078b8d]" />
            )}
          </Link>
        ))}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf1f1] px-5 py-4">
        <button
          className="text-xs font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
          type="button"
        >
          Mark all as read
        </button>
        <Link
          className="text-xs font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
          onClick={onClose}
          to="/messages"
        >
          View all messages
        </Link>
      </footer>
    </section>
  );
}
