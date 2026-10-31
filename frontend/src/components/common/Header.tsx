import { BarChart3, BriefcaseBusiness, Grid2X2, Menu, Users, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useVerifications } from "../hooks/useVerification";

const navItems = [
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Verifications", to: "/verifications", icon: BriefcaseBusiness, badge: true },
  { label: "Categories", to: "/categories", icon: Grid2X2 },
  { label: "Users", to: "/users", icon: Users },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { pendingCount } = useVerifications();
  const isActive = (to: string) => pathname === to || (to === "/reports" && pathname === "/");

  return (
    <header className="relative z-40 grid h-[72px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#edf1f1] bg-white px-[max(40px,calc((100vw-1136px)/2))] max-[920px]:h-[64px] max-[920px]:px-6 max-[680px]:h-[60px] max-[680px]:grid-cols-[1fr_auto] max-[680px]:px-4">
      <Link className="inline-flex items-center justify-self-start gap-2.5 whitespace-nowrap text-[17px] font-bold tracking-[-0.55px] text-[#263a3c] max-[680px]:gap-2 max-[680px]:text-base focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" to="/reports" aria-label="CareerConnect admin home">
        <span className="grid size-7.75 place-items-center rounded-[10px] bg-[#078b8d] text-[19px] font-bold tracking-[-1px] text-white max-[680px]:size-7 max-[680px]:rounded-lg max-[680px]:text-[17px]">C</span>
        <span>Career<span className="text-[#078b8d]">Connect</span></span>
        <span className="ml-1 rounded-md bg-[#eef7f6] px-2 py-1 text-[10px] font-semibold text-[#078b8d] max-[680px]:hidden">Admin</span>
      </Link>
      <nav className="flex h-full items-stretch justify-self-center gap-4 max-[1100px]:gap-2 max-[680px]:hidden" aria-label="Admin navigation">
        {navItems.map((item) => (
          <Link
            className={`${isActive(item.to)
              ? "text-[#087879] after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-[2px] after:bg-[#078b8d]"
              : "text-[#687b7e] hover:text-[#087879]"} relative inline-flex h-full items-center gap-1.5 whitespace-nowrap px-2.5 text-[11px] font-medium focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-3px]`}
            to={item.to}
            key={item.label}
          >
            <item.icon size={13} strokeWidth={1.8} />
            {item.label}
            {"badge" in item && pendingCount > 0 && <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[#e9a46f] text-[10px] font-bold leading-none text-white">{pendingCount}</span>}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-self-end gap-5 max-[680px]:gap-2.5">
        <button className="relative inline-flex size-9 items-center justify-center text-[#65787a] [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="Notifications">
          <HeaderIcon name="bell" />
          <span className="absolute top-1.75 right-1.75 size-1.75 rounded-full border-[1.5px] border-white bg-[#ef9c63]" />
        </button>
        <button className="inline-flex items-center gap-2 text-[#65787a] max-[680px]:hidden [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="Open profile menu">
          <span className="grid size-8 place-items-center rounded-full bg-[#d8ede7] text-[10px] font-bold text-[#36706c]">JM</span>
          <HeaderIcon name="chevron" size={14} />
        </button>
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
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}