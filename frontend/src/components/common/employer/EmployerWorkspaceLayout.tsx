import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import Footer from "@/components/common/user/userFooter";
import { useAuth } from "@/features/auth/useAuth";
import { getEmployerMessagingActor } from "@/features/messaging/api";
import { useUnreadCount } from "@/features/messaging/hooks";

const navigationItems = [
  { label: "Overview", to: "/employer/overview" },
  { label: "Job Listings", to: "/employer/listings" },
  { label: "Applicants", to: "/employer/applicants" },
  { label: "Company Profile", to: "/employer/company-profile" },
] as const;

function EmployerHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const messagingActor = useMemo(() => getEmployerMessagingActor(user), [user]);
  const { unreadCount } = useUnreadCount(messagingActor);
  const messagesActive = pathname === "/employer/messages" || pathname.startsWith("/employer/messages/");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const accountAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (accountAreaRef.current && !accountAreaRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  async function handleLogout() {
    setLogoutError(null);
    setAccountMenuOpen(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setAccountMenuOpen(true);
    }
  }

  return (
    <header className="grid h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#edf1f1] bg-white px-[max(40px,calc((100vw-1136px)/2))] max-[920px]:h-16.5 max-[920px]:px-6 max-[680px]:h-15 max-[680px]:grid-cols-[1fr_auto] max-[680px]:px-4">
      <Link
        aria-label="CareerConnect employer overview"
        className="inline-flex items-center justify-self-start gap-2.5 whitespace-nowrap text-[18px] font-bold tracking-[-0.55px] text-[#263a3c] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] max-[680px]:gap-2 max-[680px]:text-base"
        to="/employer/overview"
      >
        <span className="grid size-7.75 place-items-center rounded-[10px] bg-[#078b8d] text-[19px] font-bold tracking-[-1px] text-white max-[680px]:size-7 max-[680px]:rounded-lg max-[680px]:text-[17px]">
          C
        </span>
        <span>
          Career<span className="text-[#078b8d]">Connect</span>
        </span>
      </Link>
      <nav
        aria-label="Employer main navigation"
        className="flex h-full items-stretch justify-self-center gap-8.5 max-[1300px]:gap-6 max-[920px]:gap-4.5 max-[680px]:hidden"
      >
        {navigationItems.map(({ label, to }) => {
          const active = pathname === to;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex items-center whitespace-nowrap text-[13px] font-medium focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${
                active
                  ? "relative text-[#087879] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-[#078b8d] after:content-['']"
                  : "text-[#687b7e] hover:text-[#087879]"
              }`}
              key={to}
              to={to}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="relative flex items-center justify-self-end gap-3" ref={accountAreaRef}>
        <Link
          aria-current={messagesActive ? "page" : undefined}
          aria-label={`Messages${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          className={`relative inline-flex size-9 items-center justify-center rounded-full transition focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${messagesActive || unreadCount > 0 ? "bg-[#e6f4f0] text-[#087879]" : "text-[#65787a] hover:bg-[#f1f6f5] hover:text-[#087879]"}`}
          to="/employer/messages"
          title="Messages"
        >
          <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute top-0 right-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#d94a3d] px-1 text-[9px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <button
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
          aria-label="Open employer account menu"
          className="inline-flex items-center gap-2 text-[#65787a] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
          onClick={() => setAccountMenuOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[#d8ede7] text-[10px] font-bold text-[#36706c]">
            MP
          </span>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {accountMenuOpen && (
          <div
            aria-label="Employer account menu"
            className="absolute top-full right-0 z-50 mt-2 w-44 rounded-xl border border-[#e5eeec] bg-white p-1.5 shadow-[0_12px_30px_rgba(27,54,52,0.16)]"
            role="menu"
          >
            <button
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#a2534c] hover:bg-[#fff5f4] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
              onClick={() => void handleLogout()}
              role="menuitem"
              type="button"
            >
              Log out
            </button>
            {logoutError && <p className="px-3 py-2 text-xs text-[#a2534c]" role="alert">{logoutError}</p>}
          </div>
        )}
      </div>
    </header>
  );
}

export default function EmployerWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <EmployerHeader />
      {children}
      <Footer />
    </div>
  );
}
