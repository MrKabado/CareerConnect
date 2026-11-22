import { BriefcaseBusiness, Grid2X2, Menu, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";

const navItems = [
  { label: "Reports", to: "/admin", icon: null },
  { label: "Verifications", to: "/admin/verifications", icon: BriefcaseBusiness, badge: true },
  { label: "Categories", to: "/admin/categories", icon: Grid2X2 },
  { label: "Job Approvals", to: "/admin/job-approvals", icon: BriefcaseBusiness },
  { label: "Users", to: "/admin/users", icon: Users },
] as const;

type HeaderIconName = "bell";

function ReportIcon({ className = "size-[15px]" }: { className?: string }) {
  return (
    <img
      src="/report-icon.png"
      alt=""
      aria-hidden="true"
      className={`${className} object-contain opacity-75 transition-opacity group-hover:opacity-100`}
      draggable={false}
    />
  );
}

function HeaderIcon({ name, size = 18 }: { name: HeaderIconName; size?: number }) {
  const paths: Record<HeaderIconName, React.ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Header({
  pendingVerificationCount,
}: {
  pendingVerificationCount: number;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const adminInitials =
    user?.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A";

  const isActive = (to: string) =>
    pathname === to ||
    (to === "/admin" && pathname === "/admin/reports");

  useEffect(() => {
    if (!accountOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  async function handleLogout() {
    setLogoutError(null);
    setAccountOpen(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setAccountOpen(true);
    }
  }

  return (
    <header className="sticky top-0 z-40 grid h-[72px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#e9efee] bg-white/95 px-[max(40px,calc((100vw-1136px)/2))] shadow-[0_1px_0_rgba(29,49,51,.02)] backdrop-blur-xl max-[920px]:h-[64px] max-[920px]:px-6 max-[680px]:h-[60px] max-[680px]:grid-cols-[1fr_auto] max-[680px]:px-4">
      <Link className="inline-flex items-center justify-self-start gap-2.5 whitespace-nowrap text-[17px] font-bold tracking-[-0.55px] text-[#263a3c] max-[680px]:gap-2 max-[680px]:text-base focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" to="/" aria-label="CareerConnect home">
        <span className="grid size-7.75 place-items-center rounded-[10px] bg-[#078b8d] text-[19px] font-bold tracking-[-1px] text-white max-[680px]:size-7 max-[680px]:rounded-lg max-[680px]:text-[17px]">C</span>
        <span>Career<span className="text-[#078b8d]">Connect</span></span>
        <span className="ml-1 rounded-md bg-[#eef7f6] px-2 py-1 text-[10px] font-semibold text-[#078b8d] max-[680px]:hidden">Admin</span>
      </Link>
      <nav className="flex h-full items-stretch justify-self-center gap-4 max-[1100px]:gap-2 max-[680px]:hidden" aria-label="Admin navigation">
        {navItems.map((item) => (
          <Link
            className={`group ${isActive(item.to)
              ? "text-[#087879] after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-[2px] after:bg-[#078b8d]"
              : "text-[#687b7e] hover:text-[#087879]"} relative inline-flex h-full items-center gap-1.5 whitespace-nowrap px-2.5 text-[12px] font-semibold focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-3px]`}
            to={item.to}
            key={item.label}
          >
            {item.icon ? <item.icon size={13} strokeWidth={1.8} /> : (
              <span className="grid size-[18px] place-items-center rounded-[5px]">
                <ReportIcon />
              </span>
            )}
            {item.label}
            {"badge" in item && pendingVerificationCount > 0 && <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[#e9a46f] text-[10px] font-bold leading-none text-white">{pendingVerificationCount}</span>}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-self-end gap-5 max-[680px]:gap-2.5">
        <Link className="relative inline-flex size-9 items-center justify-center text-[#65787a] [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label={`Notifications${pendingVerificationCount > 0 ? `, ${pendingVerificationCount} pending verifications` : ""}`} to="/admin/verifications" title="Review pending verifications">
          <HeaderIcon name="bell" />
          {pendingVerificationCount > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-h-4 min-w-4 place-items-center rounded-full border border-white bg-[#d94a3d] px-1 text-[9px] font-bold text-white">{pendingVerificationCount > 9 ? "9+" : pendingVerificationCount}</span>}
        </Link>
        <div ref={accountRef} className="relative max-[680px]:hidden">
          <button
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Open administrator account menu"
            className="inline-flex items-center gap-2 rounded-lg text-[#65787a] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            onClick={() => setAccountOpen((open) => !open)}
            type="button"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[#d8ede7] text-[10px] font-bold text-[#36706c]">
              {adminInitials}
            </span>
            <span className="max-w-24 truncate text-xs font-medium">
              {user?.name ?? "Admin"}
            </span>
          </button>
          {accountOpen && (
            <div
              aria-label="Administrator account menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[#e5eeec] bg-white p-2 shadow-[0_12px_30px_rgba(27,54,52,.16)]"
              role="menu"
            >
              <div className="border-b border-[#edf1f1] px-3 py-2">
                <p className="truncate text-xs font-semibold text-[#344749]">{user?.name ?? "Administrator"}</p>
                <p className="mt-0.5 truncate text-[10px] text-[#849293]">{user?.email}</p>
              </div>
              <button
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                onClick={() => void handleLogout()}
                role="menuitem"
                type="button"
              >
                Log out
              </button>
              {logoutError && (
                <p className="px-3 py-2 text-[10px] text-red-600" role="alert">{logoutError}</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="hidden size-9 place-items-center rounded-lg text-[#65787a] max-[680px]:grid"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="absolute inset-x-0 top-full hidden border-b border-[#edf1f1] bg-white px-4 py-3 shadow-lg max-[680px]:block" aria-label="Mobile admin navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={`${isActive(item.to) ? "bg-[#eef7f6] text-[#087879]" : "text-[#687b7e]"} flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium`}
            >
              {item.icon ? <item.icon size={17} /> : <ReportIcon className="size-[18px]" />}
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}