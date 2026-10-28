import { Link } from "react-router";

type HeroProps = {
  search: string;
  onSearchChange: (value: string) => void;
  audience: "job-seeker" | "ojt-seeker";
  onAudienceChange: (audience: "job-seeker" | "ojt-seeker") => void;
  profileTags: string[];
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

export default function Hero({
  search,
  onSearchChange,
  audience,
  onAudienceChange,
  profileTags,
}: HeroProps) {
  return (
    <section className="relative border-b border-[#deeeeb] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] px-10 pt-[55px] pb-[82px] max-[920px]:px-6 max-[920px]:pt-[37px] max-[920px]:pb-6 max-[680px]:px-[17px] max-[680px]:pt-[31px] max-[680px]:pb-[22px]">
      <div className="mx-auto max-w-[1136px]">
        <div className="max-w-[690px]">
          <span className="inline-flex items-center gap-2 rounded-[20px] border border-[#f0e8d4] bg-[#fff9e9] px-[11px] py-[7px] text-[10px] font-semibold tracking-[0.08px] text-[#8b6a28]"><span className="size-[6px] rounded-full bg-[#e9ae45]" />1,240 new opportunities this week</span>
          <h1 className="mt-4 mb-[7px] text-[clamp(32px,2.85vw,38px)] leading-[1.12] font-bold tracking-[-1.45px] text-[#263638] max-[680px]:mt-[14px] max-[680px]:max-w-[420px] max-[680px]:text-[clamp(31px,9vw,40px)] max-[680px]:tracking-[-1.35px]">Find work that feels <span className="text-[#0d9290]">meaningful.</span></h1>
          <p className="text-[14px] leading-[1.55] text-[#77888a] max-[680px]:max-w-[390px] max-[680px]:text-xs">Discover roles matched to your experience, ambitions, and preferences from onboarding.</p>
        </div>
        <div className="absolute top-[46px] right-[max(40px,calc((100vw-1136px)/2))] flex items-center gap-[10px] max-[920px]:right-6 max-[680px]:static max-[680px]:mt-[17px]">
          <button
            aria-pressed={audience === "job-seeker"}
            className={`inline-flex min-h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-4 text-xs font-semibold transition-[background,transform] duration-[140ms] active:translate-y-px max-[680px]:min-h-9 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${audience === "job-seeker" ? "bg-[#07888a] text-white hover:bg-[#066f72]" : "border border-[#d9e8e6] bg-white/80 text-[#426568] hover:bg-white"}`}
            onClick={() => onAudienceChange("job-seeker")}
            type="button"
          >
            Job seeker
          </button>
          <button
            aria-pressed={audience === "ojt-seeker"}
            className={`inline-flex min-h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-4 text-xs font-semibold transition-[background,transform] duration-[140ms] active:translate-y-px max-[680px]:min-h-9 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${audience === "ojt-seeker" ? "bg-[#07888a] text-white hover:bg-[#066f72]" : "border border-[#d9e8e6] bg-white/80 text-[#426568] hover:bg-white"}`}
            onClick={() => onAudienceChange("ojt-seeker")}
            type="button"
          >
            OJT seeker
          </button>
        </div>

        <form className="mt-[34px] flex gap-2 rounded-[13px] border border-[#e7eeee] bg-white p-2 shadow-[0_9px_22px_rgba(54,103,99,0.08)] max-[680px]:mt-[21px] max-[680px]:flex-col max-[680px]:gap-0 max-[680px]:rounded-[11px] max-[680px]:p-[7px]" onSubmit={(event) => { event.preventDefault(); document.getElementById("jobs")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
          <label className="flex min-w-0 flex-1 items-center gap-[10px] px-[13px] text-[#90a0a1] focus-within:text-[#078b8d] max-[680px]:min-h-[43px] max-[680px]:px-[9px]">
            <HeroIcon name="search" />
            <input className="h-12 w-full min-w-0 border-0 bg-transparent text-xs text-[#344749] outline-none placeholder:text-[#9ba8a9] max-[680px]:h-10 max-[680px]:text-xs focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="Job title, skill, or company" placeholder="Job title, skill, or company" value={search} onChange={(event) => onSearchChange(event.target.value)} />
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-[10px] border-l border-[#e9eeee] px-[13px] text-[#90a0a1] focus-within:text-[#078b8d] max-[680px]:min-h-[43px] max-[680px]:border-t max-[680px]:border-l-0 max-[680px]:border-t-[#edf0f0] max-[680px]:px-[9px]">
            <HeroIcon name="pin" />
            <input className="h-12 w-full min-w-0 border-0 bg-transparent text-xs text-[#344749] outline-none placeholder:text-[#9ba8a9] max-[680px]:h-10 max-[680px]:text-xs focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" aria-label="City, province, or remote" placeholder="City, province, or remote" />
          </label>
          <button className="inline-flex min-h-[38px] min-w-[122px] items-center justify-center gap-2 rounded-lg bg-[#07888a] px-4 text-xs font-semibold text-white transition-[background,transform] duration-[140ms] hover:bg-[#066f72] active:translate-y-px max-[680px]:mt-[6px] max-[680px]:min-h-9 max-[680px]:w-full focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" type="submit"><HeroIcon name="search" size={17} />Search jobs</button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[#748486] max-[680px]:mt-[13px] max-[680px]:gap-[6px] max-[680px]:text-[10px]">
          <span className="max-[680px]:basis-full">Personalized for you:</span>
          {(profileTags.length > 0
            ? profileTags
            : ["Complete your profile for personalized matches"]
          ).map((tag) => (
            <span
              className="rounded-[20px] bg-[#def1ee] px-[9px] py-[5px] text-[10px] font-semibold text-[#477779]"
              key={tag}
            >
              {tag}
            </span>
          ))}
          <Link
            className="ml-[7px] py-1 text-[11px] font-semibold text-[#087d80] hover:underline max-[680px]:ml-[3px] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
            to="/onboarding"
          >
            Update preferences
          </Link>
        </div>
      </div>
    </section>
  );
}
