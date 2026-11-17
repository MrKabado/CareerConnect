type HeroProps = {
  search: string;
  onSearchChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
};

type HeroIconName = "search" | "pin";

function HeroIcon({ name, size = 19 }: { name: HeroIconName; size?: number }) {
  const paths: Record<HeroIconName, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Hero({ search, onSearchChange, location, onLocationChange }: HeroProps) {
  return (
    <section className="relative border-b border-[#deeeeb] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] px-10 pt-13.75 pb-13.75 max-[920px]:px-6 max-[920px]:pt-9.25 max-[920px]:pb-6 max-[680px]:px-4.25 max-[680px]:pt-7.75 max-[
    680px]:pb-[22px]">
      <div className="mx-auto max-w-284">
        <div className="max-w-172.5">
          <span className="inline-flex items-center gap-2 rounded-[20px] border border-[#f0e8d4] bg-[#fff9e9] px-2.75 py-1.75 text-[10px] font-semibold tracking-[0.08px] text-[#8b6a28]"><span className="size-1.5 rounded-full bg-[#e9ae45]" />1,240 new opportunities this week</span>
          <h1 className="mt-4 mb-1.75 text-[clamp(32px,2.85vw,38px)] leading-[1.12] font-bold tracking-[-1.45px] text-[#263638] max-[680px]:mt-3.5 max-[680px]:max-w-105 max-[680px]:text-[clamp(31px,9vw,40px)] max-[680px]:tracking-[-1.35px]">Find work that feels <span className="text-[#0d9290]">meaningful.</span></h1>
          <p className="text-[14px] leading-[1.55] text-[#77888a] max-[680px]:max-w-97.5 max-[680px]:text-xs">Browse open roles and search for opportunities that match your skills and interests.</p>
        </div>

        <form className="mt-8.5 flex gap-2 rounded-[13px] border border-[#e7eeee] bg-white p-2 shadow-[0_9px_22px_rgba(54,103,99,0.08)] max-[680px]:mt-5.25 max-[680px]:flex-col max-[680px]:gap-0 max-[680px]:rounded-[11px] max-[680px]:p-1.75" onSubmit={(event) => { event.preventDefault(); document.getElementById("jobs")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
          <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3.25 text-[#90a0a1] focus-within:text-[#078b8d] max-[680px]:min-h-10.75 max-[680px]:px-2.25">
            <HeroIcon name="search" />
            <input className="h-12 w-full min-w-0 border-0 bg-transparent text-xs text-[#344749] outline-none placeholder:text-[#9ba8a9] max-[680px]:h-10 max-[680px]:text-xs focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="Job title, skill, or company" placeholder="Job title, skill, or company" value={search} onChange={(event) => onSearchChange(event.target.value)} />
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2.5 border-l border-[#e9eeee] px-3.25 text-[#90a0a1] focus-within:text-[#078b8d] max-[680px]:min-h-10.75 max-[680px]:border-t max-[680px]:border-l-0 max-[680px]:border-t-[#edf0f0] max-[680px]:px-2.25">
            <HeroIcon name="pin" />
            <input className="h-12 w-full min-w-0 border-0 bg-transparent text-xs text-[#344749] outline-none placeholder:text-[#9ba8a9] max-[680px]:h-10 max-[680px]:text-xs focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="City, province, or remote" placeholder="City, province, or remote" value={location} onChange={(event) => onLocationChange(event.target.value)} />
          </label>
          <button className="inline-flex min-h-9.5 min-w-30.5 items-center justify-center gap-2 rounded-lg bg-[#07888a] px-4 text-xs font-semibold text-white transition-[background,transform] duration-140 hover:bg-[#066f72] active:translate-y-px max-[680px]:mt-1.5 max-[680px]:min-h-9 max-[680px]:w-full focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" type="submit"><HeroIcon name="search" size={17} />Search jobs</button>
        </form>

      </div>
    </section>
  );
}
