import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { getApplicantMessagingActor, markAllNotificationsRead } from "@/features/messaging/api";
import { useNotifications, useUnreadCount } from "@/features/messaging/hooks";
import NotificationFeed from "@/features/messaging/components/NotificationFeed";

export default function NotificationBell() {
  const { user } = useAuth();
  const actor = useMemo(() => getApplicantMessagingActor(user), [user]);
  const { notifications, loading, error: feedError, refresh: refreshNotifications } = useNotifications(actor);
  const { unreadCount, error: countError, refresh: refreshUnread } = useUnreadCount(actor);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = rootRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!actor) return null;
  const applicantActor = actor;

  async function handleMarkAllRead() {
    setActionError(null);
    try {
      await markAllNotificationsRead(applicantActor);
      await Promise.all([refreshNotifications(), refreshUnread()]);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not mark notifications as read.");
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="applicant-notification-feed"
        className="relative inline-flex size-9 items-center justify-center text-[#65787a] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
        onClick={() => setOpen((current) => !current)}
        ref={bellRef}
        type="button"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#d94a3d] px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {(countError || actionError) && (
        <span className="sr-only" role="alert">{actionError ?? countError?.message}</span>
      )}
      {open && (
        <div id="applicant-notification-feed">
          <NotificationFeed
            error={feedError?.message ?? actionError}
            items={notifications}
            loading={loading}
            onClose={() => {
              setOpen(false);
              bellRef.current?.focus();
            }}
            onMarkAllRead={() => void handleMarkAllRead()}
          />
        </div>
      )}
    </div>
  );
}
