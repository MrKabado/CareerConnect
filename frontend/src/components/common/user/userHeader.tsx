import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import applicationsNavIcon from "@/assets/Icon (7).svg";
import recommendationsNavIcon from "@/assets/Icon (8).svg";
import jobSearchNavIcon from "@/assets/Icon (9).svg";
import profileNavIcon from "@/assets/Icon (10).svg";

const navItems = [
  { label: "Job Search", to: "/job-search", icon: jobSearchNavIcon },
  { label: "Recommendations", to: "/recommendations", icon: recommendationsNavIcon },
  { label: "My Applications", to: "/applications", icon: applicationsNavIcon },
  { label: "Profile", to: "/profile", icon: profileNavIcon },
] as const;

type HeaderIconName = "bell" | "chevron";

function HeaderIcon({ name, size = 18 }: { name: HeaderIconName; size?: number }) {
  const paths: Record<HeaderIconName, React.ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<
    "notifications" | "account" | null
  >(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const dropdownAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdown) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        dropdownAreaRef.current &&
        !dropdownAreaRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenDropdown(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdown]);

  async function handleLogout() {
    setLogoutError(null);
    setOpenDropdown(null);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setOpenDropdown("account");
    }
  }

  return (
    <header className="grid h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#edf1f1] bg-white px-[max(40px,calc((100vw-1136px)/2))] max-[920px]:h-16.5 max-[920px]:px-6 max-[680px]:h-15 max-[680px]:grid-cols-[1fr_auto] max-[680px]:px-4.25">
      <Link className="inline-flex items-center justify-self-start gap-2.5 whitespace-nowrap text-[18px] font-bold tracking-[-0.55px] text-[#263a3c] max-[680px]:gap-2 max-[680px]:text-base focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" to="/job-search" aria-label="CareerConnect home">
        <span className="grid size-7.75 place-items-center rounded-[10px] bg-[#078b8d] text-[19px] font-bold tracking-[-1px] text-white max-[680px]:size-7 max-[680px]:rounded-lg max-[680px]:text-[17px]">C</span>
        <span>Career<span className="text-[#078b8d]">Connect</span></span>
      </Link>
      <nav className="flex h-full items-stretch justify-self-center gap-8.5 max-[1300px]:gap-6 max-[920px]:gap-4.5 min-[681px]:max-[760px]:[&>*:nth-child(3)]:hidden max-[920px]:[&>*:nth-child(2)]:hidden max-[680px]:hidden" aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            className={`${(pathname === item.to || (item.label === "Job Search" && (pathname === "/" || pathname === "/ojt-search" || pathname.startsWith("/apply/"))))
              ? "relative text-[#087879] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-[#078b8d] after:content-['']"
              : "text-[#687b7e] hover:text-[#087879]"} flex items-center gap-1.25 whitespace-nowrap text-[13px] font-medium max-[920px]:text-[11px] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]`}
            to={item.to}
            key={item.label}
          >
            <img className="size-3 object-contain" src={item.icon} alt="" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div
        className="flex items-center justify-self-end gap-5 max-[680px]:gap-2.5"
        ref={dropdownAreaRef}
      >
        <div className="relative">
          <button
            aria-expanded={openDropdown === "notifications"}
            aria-haspopup="dialog"
            className="relative inline-flex size-9 items-center justify-center text-[#65787a] [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
            onClick={() =>
              setOpenDropdown((current) =>
                current === "notifications" ? null : "notifications",
              )
            }
            type="button"
          >
            <span className="sr-only">Notifications</span>
            <HeaderIcon name="bell" />
          </button>
          {openDropdown === "notifications" && (
            <section
              aria-label="Notifications"
              className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#e5eeec] bg-white p-4 shadow-[0_12px_30px_rgba(27,54,52,0.16)]"
              role="dialog"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[12px] font-bold text-[#344749]">
                  Notifications
                </h2>
                <button
                  aria-label="Close notifications"
                  className="rounded px-1 text-[18px] leading-none text-[#829092] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                  onClick={() => setOpenDropdown(null)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <p className="mt-3 text-[10px] font-semibold text-[#526365]">
                You’re all caught up
              </p>
              <p className="mt-1 text-[9px] leading-4 text-[#829092]">
                Application updates and opportunity alerts will appear here.
              </p>
              <Link
                className="mt-3 inline-flex text-[9px] font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                onClick={() => setOpenDropdown(null)}
                to="/applications"
              >
                View applications
              </Link>
            </section>
          )}
        </div>
        <div className="relative">
          <button
            aria-expanded={openDropdown === "account"}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="inline-flex items-center gap-2 text-[#65787a] [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
            onClick={() =>
              setOpenDropdown((current) =>
                current === "account" ? null : "account",
              )
            }
            type="button"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[#d8ede7] text-[10px] font-bold text-[#36706c]">
              JM
            </span>
            <HeaderIcon name="chevron" size={14} />
          </button>
          {openDropdown === "account" && (
            <div
              aria-label="Account menu"
              className="absolute top-full right-0 z-50 mt-2 w-44 rounded-xl border border-[#e5eeec] bg-white p-1.5 shadow-[0_12px_30px_rgba(27,54,52,0.16)]"
              role="menu"
            >
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-semibold text-[#a2534c] hover:bg-[#fff5f4] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                onClick={() => void handleLogout()}
                role="menuitem"
                type="button"
              >
                Log out
              </button>
              {logoutError && (
                <p className="px-3 py-2 text-[9px] text-[#a2534c]" role="alert">
                  {logoutError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
