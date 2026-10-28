import { Link, useLocation } from "react-router";
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
      <div className="flex items-center justify-self-end gap-5 max-[680px]:gap-2.5">
        <button className="relative inline-flex size-9 items-center justify-center text-[#65787a] [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="Notifications">
          <HeaderIcon name="bell" />
          <span className="absolute top-1.75 right-1.75 size-1.75 rounded-full border-[1.5px] border-white bg-[#ef9c63]" />
        </button>
        <button className="inline-flex items-center gap-2 text-[#65787a] [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="Open profile menu">
          <span className="grid size-8 place-items-center rounded-full bg-[#d8ede7] text-[10px] font-bold text-[#36706c]">JM</span>
          <HeaderIcon name="chevron" size={14} />
        </button>
      </div>
    </header>
  );
}
