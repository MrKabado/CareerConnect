import { Link } from "react-router";
import type { CompanyProfile } from "@/features/companies/companyProfiles";

function CompanyMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[82px] rounded-[15px] border border-white/80 bg-white/90 px-4 py-3 text-center shadow-[0_4px_12px_rgba(47,102,96,0.06)]">
      <p className="text-[17px] font-bold leading-tight text-[#263a3c]">{value}</p>
      <p className="mt-1 text-[9px] text-[#829091]">{label}</p>
    </div>
  );
}

export function CompanyProfileHeader() {
  return (
    <header className="flex h-[54px] items-center justify-between border-b border-[#e9eeee] bg-white px-6 max-[680px]:px-4">
      <Link
        aria-label="CareerConnect home"
        className="inline-flex items-center gap-2 text-[13px] font-bold tracking-[-0.3px] text-[#263a3c] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
        to="/job-search"
      >
        <span className="grid size-7 place-items-center rounded-[8px] bg-[#078b98] text-[12px] font-bold text-white">
          C
        </span>
        <span>
          Career<span className="text-[#078b98]">Connect</span>
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          className="text-[9px] font-semibold text-[#738385] hover:text-[#07878b] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          to="/job-search"
        >
          Back to jobs
        </Link>
        <span className="grid size-7 place-items-center rounded-full bg-[#def3ef] text-[8px] font-bold text-[#267e7a]">
          JM
        </span>
      </div>
    </header>
  );
}

export function CompanyHero({ profile }: { profile: CompanyProfile }) {
  return (
    <section className="border-b border-[#e1efec] bg-[radial-gradient(ellipse_at_80%_10%,rgba(192,244,232,0.5),transparent_44%),linear-gradient(112deg,#eff9f7_0%,#e9f8f5_56%,#ddf5ef_100%)] px-6 py-7 max-[680px]:px-4 max-[680px]:py-5">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-[58px] shrink-0 place-items-center rounded-[17px] bg-[#078b98] text-[20px] font-bold text-white shadow-[0_6px_12px_rgba(7,139,152,0.2)]">
              {profile.initials}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#def4ee] px-2 py-1 text-[8px] font-semibold text-[#24877c]">
                    <span aria-hidden="true">✓</span> Verified employer
                  </span>
                )}
                {profile.recommended && (
                  <span className="rounded-full bg-[#fff1d9] px-2 py-1 text-[8px] font-semibold text-[#a87827]">
                    Top recommended
                  </span>
                )}
              </div>
              <h1 className="truncate text-[25px] font-bold tracking-[-0.65px] text-[#263a3c] max-[680px]:text-[21px]">
                {profile.name}
              </h1>
              <p className="mt-1 text-[10px] text-[#7b8b8d]">
                {profile.location} · {profile.industry}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CompanyMetric label="Open roles" value={String(profile.openRoles.length)} />
            <CompanyMetric label="Team members" value={profile.teamSize} />
            <CompanyMetric label="Employer rating" value={profile.rating} />
          </div>
        </div>

        <p className="mt-4 max-w-[730px] text-[11px] leading-[1.65] text-[#657779]">
          {profile.overview}
        </p>
      </div>
    </section>
  );
}

export function CompanyHighlights({ profile }: { profile: CompanyProfile }) {
  return (
    <aside className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">
        Why {profile.name} matches you
      </h2>
      <ul className="mt-3 space-y-3">
        {profile.highlights.map((highlight) => (
          <li
            className="flex items-start gap-2 text-[9px] leading-[1.5] text-[#728284]"
            key={highlight}
          >
            <span className="mt-px grid size-3.5 shrink-0 place-items-center rounded-full bg-[#e1f6f1] text-[8px] font-bold text-[#269a91]">
              ✓
            </span>
            {highlight}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function CompanyApplicationProcess({
  steps,
}: {
  steps: CompanyProfile["applicationProcess"];
}) {
  return (
    <aside className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">
        Application process
      </h2>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, index) => (
          <li
            className="flex items-center gap-2.5 text-[9px] text-[#728284]"
            key={step}
          >
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#e1f6f1] text-[8px] font-bold text-[#269a91]">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function CompanyOpenRoles({ profile }: { profile: CompanyProfile }) {
  return (
    <section aria-labelledby="company-open-roles" className="min-w-0">
      <div className="mb-3">
        <h2
          className="text-[16px] font-bold tracking-[-0.25px] text-[#2d4244]"
          id="company-open-roles"
        >
          Open opportunities
        </h2>
        <p className="mt-1 text-[9px] text-[#839192]">
          Roles matched to your CareerConnect profile and preferences.
        </p>
      </div>

      <div className="space-y-3">
        {profile.openRoles.map((role) => (
          <article
            className="rounded-[15px] border border-[#e7eeee] bg-white p-4 shadow-[0_4px_14px_rgba(39,85,82,0.04)]"
            key={role.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-[12px] font-bold text-[#2d4244]">
                    {role.title}
                  </h3>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${
                      role.type === "OJT"
                        ? "bg-[#fff0dc] text-[#bd852d]"
                        : "bg-[#e4f5f2] text-[#28847f]"
                    }`}
                  >
                    {role.type}
                  </span>
                  <span className="rounded-full bg-[#eff6f5] px-1.5 py-0.5 text-[8px] font-semibold text-[#54797a]">
                    {role.type === "OJT" ? "93%" : "96%"} match
                  </span>
                </div>
                <p className="mt-1 text-[9px] font-medium text-[#718184]">
                  {role.category}
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-1 rounded-[7px] bg-[#078b98] px-2.5 py-1.5 text-[8px] font-semibold text-white shadow-[0_3px_8px_rgba(7,139,152,0.16)] hover:bg-[#067983] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                to={`/apply/${role.id}`}
              >
                Apply now <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[8px] text-[#839192]">
              <span>{role.location}</span>
              <span>·</span>
              <span>{role.arrangement}</span>
              <span>·</span>
              <span className="font-semibold text-[#7b898a]">{role.salary}</span>
            </div>
            <p className="mt-2 text-[9px] leading-[1.5] text-[#748385]">
              {role.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {role.skills.map((skill) => (
                <span
                  className="rounded-full bg-[#f0f6f5] px-2 py-1 text-[8px] font-medium text-[#607a7b]"
                  key={skill}
                >
                  {skill}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const lifeIcons: Record<CompanyProfile["lifeAt"][number]["icon"], string> = {
  impact: "✦",
  learn: "▣",
  belong: "♙",
};

export function CompanyLifeAt({ profile }: { profile: CompanyProfile }) {
  return (
    <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[13px] font-bold text-[#2d4244]">
        Life at {profile.name}
      </h2>
      <p className="mt-1 text-[9px] leading-[1.55] text-[#809091]">
        Work with multidisciplinary teams solving meaningful problems at scale.
        {` ${profile.name}`} supports continuous learning, inclusive collaboration,
        and flexible ways of working across teams.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {profile.lifeAt.map((item) => (
          <article
            className="rounded-[12px] bg-[#f1f7f6] p-3"
            key={item.title}
          >
            <span className="grid size-6 place-items-center rounded-lg bg-[#dff4ef] text-[11px] text-[#168c8e]">
              {lifeIcons[item.icon]}
            </span>
            <h3 className="mt-2 text-[9px] font-bold text-[#34494b]">
              {item.title}
            </h3>
            <p className="mt-1 text-[8px] leading-[1.45] text-[#819091]">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
