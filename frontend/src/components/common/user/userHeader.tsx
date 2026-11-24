import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { getApplicantMessagingActor } from "@/features/messaging/api";
import applicationsNavIcon from "@/assets/Icon (7).svg";
import recommendationsNavIcon from "@/assets/Icon (8).svg";
import jobSearchNavIcon from "@/assets/Icon (9).svg";
import profileNavIcon from "@/assets/Icon (10).svg";
import { useUnreadCount } from "@/features/messaging/hooks";
import { applicantFilesApi } from "@/features/user-profile/backendApi";
import RoleNotificationBell from "@/features/notifications/RoleNotificationBell";
import { useScrollDirectionHeader } from "@/hooks/useScrollDirectionHeader";

const navItems = [
  { label: "Search Job", to: "/job-search", icon: jobSearchNavIcon },
  { label: "OJT Search", to: "/ojt-search", icon: jobSearchNavIcon },
  { label: "Recommendations", to: "/recommendations", icon: recommendationsNavIcon },
  { label: "My Applications", to: "/applications", icon: applicationsNavIcon },
  { label: "Profile", to: "/profile", icon: profileNavIcon },
] as const;

type HeaderIconName = "chevron";

function HeaderIcon({ name, size = 18 }: { name: HeaderIconName; size?: number }) {
  const paths: Record<HeaderIconName, React.ReactNode> = {
    chevron: <path d="m6 9 6 6 6-6" />,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function MessagesIconLink({ unreadCount }: { unreadCount: number }) {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith("/messages");

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={`Messages${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      className={`relative inline-flex size-9 items-center justify-center rounded-full transition focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${isActive || unreadCount > 0 ? "bg-[#e6f4f0] text-[#087879]" : "text-[#65787a] hover:bg-[#f1f6f5] hover:text-[#087879]"}`}
      to="/messages"
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
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, status, token, user } = useAuth();
  const isApplicant = user?.role === "applicant";
  const visibleNavItems = isApplicant
    ? navItems.filter((item) => item.to !== "/ojt-search")
    : navItems.slice(0, 2);
  const userInitials = user?.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "U";
  const messagingActor = useMemo(
    () => getApplicantMessagingActor(user),
    [user],
  );
  const { unreadCount } = useUnreadCount(messagingActor);
  const [openDropdown, setOpenDropdown] = useState<"account" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const dropdownAreaRef = useRef<HTMLDivElement>(null);
  const { headerRef, isVisible: headerVisible } = useScrollDirectionHeader(
    mobileMenuOpen || openDropdown !== null,
  );
  const isNavItemActive = (to: string) =>
    pathname === to ||
    (to === "/job-search" &&
      (pathname === "/" || pathname.startsWith("/apply/")));

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

  useEffect(() => {
    if (user?.role !== "applicant" || !token) {
      return;
    }

    let active = true;
    applicantFilesApi
      .profile(token)
      .then((response) => {
        if (active) setProfilePhotoUrl(response.data.profile_photo_url);
      })
      .catch(() => {
        if (active) setProfilePhotoUrl(null);
      });

    function handleProfilePhotoChanged(event: Event) {
      const customEvent = event as CustomEvent<string | null>;
      if (active) setProfilePhotoUrl(customEvent.detail);
    }

    window.addEventListener(
      "careerconnect-profile-photo-changed",
      handleProfilePhotoChanged,
    );

    return () => {
      active = false;
      window.removeEventListener(
        "careerconnect-profile-photo-changed",
        handleProfilePhotoChanged,
      );
    };
  }, [token, user?.role]);

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
    <header
      className={`sticky top-0 z-50 grid h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#edf1f1] bg-white px-[max(40px,calc((100vw-1136px)/2))] transition-transform duration-300 motion-reduce:transition-none max-[920px]:h-16.5 max-[920px]:px-6 max-[680px]:h-15 max-[680px]:grid-cols-[1fr_auto] max-[680px]:px-4.25 ${
        headerVisible ? "translate-y-0" : "-translate-y-full"
      }`}
      ref={headerRef}
    >
      <Link className="inline-flex items-center justify-self-start gap-2.5 whitespace-nowrap text-[18px] font-bold tracking-[-0.55px] text-[#263a3c] max-[680px]:gap-2 max-[680px]:text-base focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" to="/" aria-label="CareerConnect home">
        <span className="grid size-7.75 place-items-center rounded-[10px] bg-[#078b8d] text-[19px] font-bold tracking-[-1px] text-white max-[680px]:size-7 max-[680px]:rounded-lg max-[680px]:text-[17px]">C</span>
        <span>Career<span className="text-[#078b8d]">Connect</span></span>
      </Link>
      <nav className="flex h-full items-stretch justify-self-center gap-8.5 max-[1300px]:gap-6 max-[920px]:gap-4.5 min-[681px]:max-[760px]:[&>*:nth-child(3)]:hidden max-[920px]:[&>*:nth-child(2)]:hidden max-[680px]:hidden" aria-label="Main navigation">
        {visibleNavItems.map((item) => (
          <Link
            aria-current={isNavItemActive(item.to) ? "page" : undefined}
            className={`${isNavItemActive(item.to)
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
        {isApplicant && <MessagesIconLink unreadCount={unreadCount} />}
        {isApplicant && <RoleNotificationBell role="applicant" />}
        <button
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          className="hidden size-9 place-items-center rounded-lg text-[#65787a] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] max-[680px]:grid"
          onClick={() => setMobileMenuOpen((open) => !open)}
          type="button"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        {user ? (
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
              <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-[#d8ede7] text-[10px] font-bold text-[#36706c]">
                {isApplicant && profilePhotoUrl ? (
                  <img
                    alt={`${user.name} profile`}
                    className="size-full object-cover"
                    src={profilePhotoUrl}
                  />
                ) : (
                  userInitials
                )}
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
        ) : status !== "loading" ? (
          <Link
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#087879] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
            to="/login"
          >
            Log in
          </Link>
        ) : null}
      </div>
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile main navigation"
          className="absolute inset-x-0 top-full z-40 border-b border-[#edf1f1] bg-white px-4 py-3 shadow-lg min-[681px]:hidden"
        >
          {visibleNavItems.map((item) => (
            <Link
              aria-current={isNavItemActive(item.to) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                isNavItemActive(item.to)
                  ? "bg-[#eef7f6] text-[#087879]"
                  : "text-[#687b7e] hover:bg-[#f5f8f8]"
              }`}
              key={item.label}
              onClick={() => setMobileMenuOpen(false)}
              to={item.to}
            >
              <img className="size-4 object-contain" src={item.icon} alt="" />
              {item.label}
            </Link>
          ))}
          {isApplicant && (
            <Link
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                pathname.startsWith("/messages")
                  ? "bg-[#eef7f6] text-[#087879]"
                  : "text-[#687b7e] hover:bg-[#f5f8f8]"
              }`}
              onClick={() => setMobileMenuOpen(false)}
              to="/messages"
            >
              Messages
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
