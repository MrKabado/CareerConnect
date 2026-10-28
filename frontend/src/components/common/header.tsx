import jobSearchNavIcon from "@/assets/Icon (9).svg";

const navItems = [
  { label: "Job Search", href: "#jobs", icon: jobSearchNavIcon, active: true },
] as const;

export default function Header() {
  return (
    <header className="grid h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#edf1f1] bg-white px-[max(40px,calc((100vw-1136px)/2))] max-[1300px]:px-10 max-[920px]:h-16.5 max-[920px]:px-6 max-[680px]:h-15 max-[680px]:grid-cols-[1fr_auto] max-[680px]:px-4.25">
      <a className="inline-flex items-center justify-self-start gap-2.5 whitespace-nowrap text-[18px] font-bold tracking-[-0.55px] text-[#263a3c] max-[680px]:gap-2 max-[680px]:text-base focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" href="/" aria-label="CareerConnect home">
        <span className="grid size-7.75 place-items-center rounded-[10px] bg-[#078b8d] text-[19px] font-bold tracking-[-1px] text-white max-[680px]:size-7 max-[680px]:rounded-lg max-[680px]:text-[17px]">C</span>
        <span>Career<span className="text-[#078b8d]">Connect</span></span>
      </a>
      <nav className="flex h-full items-stretch justify-self-center gap-8.5 max-[1300px]:gap-6 max-[920px]:gap-4.5 min-[681px]:max-[760px]:[&>*:nth-child(3)]:hidden max-[920px]:[&>*:nth-child(2)]:hidden max-[680px]:hidden" aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            className={`${item.active
              ? "relative text-[#087879] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-[#078b8d] after:content-['']"
              : "text-[#687b7e] hover:text-[#087879]"} flex items-center gap-1.25 whitespace-nowrap text-[13px] font-medium max-[920px]:text-[11px] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]`}
            href={item.href}
            key={item.label}
          >
            <img className="size-3 object-contain" src={item.icon} alt="" />
            {item.label}
          </a>
        ))}
      </nav>
      <a
        className="inline-flex min-h-9 items-center justify-center justify-self-end rounded-lg bg-[#078b8d] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#066f72] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
        href="/login"
      >
        Log in
      </a>
    </header>
  );
}
