import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { applicationStore } from "@/features/applications/applicationData";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";
import type { JobListing } from "@/features/jobs/jobListings";

type IconName = "bookmark" | "pin" | "briefcase" | "salary" | "sparkles" | "edit";

function Icon({
  name,
  size = 14,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, ReactNode> = {
    bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    salary: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h.01M17 15h.01M12 9v6m2-4c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2 .9 2 2-.9 2-2 2-2-.9-2-2" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
        <path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 16l.7 1.3L7 18l-1.3.7L5 20l-.7-1.3L3 18l1.3-.7L5 16Z" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

export function EmailVerificationNotice({
  email,
  onDismiss,
}: {
  email: string;
  onDismiss: () => void;
}) {
  return (
    <aside className="mb-6 flex items-center gap-3 rounded-[12px] border border-[#f1dfbd] bg-[#fff7e8] px-4 py-3 text-[#765b2a] max-[600px]:items-start max-[600px]:px-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/80 text-[#a87b35]">
        <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 16 16">
          <rect height="11" rx="2" stroke="currentColor" strokeWidth="1.2" width="11" x="2.5" y="2.5" />
          <path d="m5 5 3 2.5L11 5m-6 4h6m-6 2h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold">Verify your email</p>
        <p className="mt-0.5 text-[11px] leading-5 text-[#8a7959]">
          We sent a verification link to {email}. Verify it to keep your account
          secure.
        </p>
      </div>
      <button
        className="shrink-0 rounded px-2 py-1 text-[10px] font-semibold text-[#8d702f] hover:bg-[#f9edda] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
        onClick={onDismiss}
        type="button"
      >
        Dismiss
      </button>
    </aside>
  );
}

export type RecommendedJob = JobListing & {
  matchScore: number | null;
  matchReasons: string[];
};

export function RecommendedJobCard({
  job,
  isBestMatch,
}: {
  job: RecommendedJob;
  isBestMatch: boolean;
}) {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [showMatchReasons, setShowMatchReasons] = useState(false);
  const matchScore = job.matchScore ?? 0;
  const hasApplied = useSyncExternalStore(
    applicationStore.subscribe,
    () => applicationStore.hasAppliedTo(job.id),
    () => applicationStore.hasAppliedTo(job.id),
  );

  return (
    <article
      aria-label={`View ${job.company} company profile`}
      className={`cursor-pointer overflow-hidden rounded-[14px] border bg-white shadow-[0_3px_10px_rgba(39,85,82,0.025)] transition-[border-color,box-shadow] hover:border-[#b9dcda] hover:shadow-[0_7px_18px_rgba(39,85,82,0.07)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${
        isBestMatch
          ? "border-[#078b8d] ring-2 ring-[#078b8d]/10"
          : "border-[#dcebea]"
      }`}
      onClick={() => navigate(getCompanyProfileUrl(job.company))}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          navigate(getCompanyProfileUrl(job.company));
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="ml-[17px] mt-[18px] grid size-[42px] shrink-0 place-items-center rounded-[10px] border border-[#e5efed] bg-[#078b8d] text-[16px] font-bold text-white max-[600px]:ml-3 max-[600px]:mt-3 max-[600px]:size-[34px]">
          {job.initials}
        </div>
        <div className="min-w-0 flex-1 py-[17px] pr-[17px] max-[600px]:py-3 max-[600px]:pr-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {isBestMatch && (
                <span className="mb-1 inline-flex rounded-full bg-[#e6f7f3] px-2 py-1 text-[9px] font-semibold text-[#087f78]">
                  Best match
                </span>
              )}
              <h3 className="text-[17px] font-bold tracking-[-0.15px] text-[#2b3e3f] max-[600px]:text-[14px]">
                {job.title}
              </h3>
              <p className="mt-1 text-[13px] font-medium text-[#647779] max-[600px]:text-[11px]">
                {job.company}
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <div
                aria-label={`${matchScore}% match`}
                className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold ${
                  isBestMatch
                    ? "bg-[#e6f7f3] text-[#087f78]"
                    : "bg-[#eff6f5] text-[#54797a]"
                }`}
              >
                {matchScore}% match
              </div>
              <button
                aria-label={isSaved ? "Remove saved job" : "Save job"}
                aria-pressed={isSaved}
                className={`mt-1 rounded p-1 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${
                  isSaved ? "text-[#078b8d]" : "text-[#829294]"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsSaved((saved) => !saved);
                }}
                type="button"
              >
                <Icon name="bookmark" size={15} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-[7px] text-[12px] text-[#778789] max-[600px]:text-[9px]">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={14} />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="briefcase" size={14} />
              {job.arrangement}
            </span>
            <span className="font-semibold text-[#1b7776] max-[600px]:basis-full">
              {job.salary}
            </span>
          </div>

          <p className="my-2 text-[12px] leading-[1.45] text-[#748385] max-[600px]:text-[10px]">
            {job.description}
          </p>
          <div className="flex flex-wrap gap-[5px]">
            {job.skills.map((skill) => (
              <span
                className="rounded-[4px] bg-[#eff6f5] px-[7px] py-1 text-[11px] font-medium text-[#54797a] max-[600px]:text-[9px]"
                key={skill}
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="mt-[9px] flex items-center justify-between gap-2 border-t border-[#edf1f1] pt-2">
            <div>
              <button
                aria-expanded={showMatchReasons}
                className="inline-flex items-center gap-1.5 rounded text-[10px] font-semibold text-[#078b8d] hover:text-[#066f72] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMatchReasons((shown) => !shown);
                }}
                type="button"
              >
                <span aria-hidden="true" className="text-[13px] leading-none">
                  {showMatchReasons ? "⌄" : "›"}
                </span>
                Why this matches
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[9px] text-[#9aa6a7]">
                {job.posted}
              </span>
              {hasApplied && (
                <span className="rounded-full bg-[#eaf6f3] px-2.5 py-1.5 text-[9px] font-semibold text-[#39817c]">
                  Applied
                </span>
              )}
            </div>
          </div>
          {showMatchReasons && (
            <p className="mt-2 text-[10px] leading-5 text-[#718184]">
              {job.matchReasons.length > 0
                ? `This role aligns with your ${job.matchReasons.join(", ")}.`
                : "Complete a job-seeker profile to see why this role may be a fit."}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function PreferencesSummary({ tags }: { tags: string[] }) {
  return (
    <section className="rounded-[14px] border border-[#e8eeee] bg-white px-5 py-[17px] shadow-[0_5px_16px_rgba(39,85,82,0.035)] max-[600px]:px-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold text-[#344749]">Your preferences</h2>
        <Link
          className="inline-flex items-center gap-1.5 rounded text-[10px] font-semibold text-[#078b8d] hover:text-[#066f72] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          to="/onboarding"
        >
          <Icon name="edit" size={12} />
          Edit preferences
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              className="rounded-full bg-[#e4f4f1] px-2.5 py-1 text-[9px] font-semibold text-[#467a78]"
              key={tag}
            >
              {tag}
            </span>
          ))
        ) : (
          <p className="text-[10px] text-[#8a999a]">
            Add your interests and work preferences to personalize these matches.
          </p>
        )}
      </div>
    </section>
  );
}

export function MatchingExplainer() {
  return (
    <section className="rounded-[14px] border border-[#e3f0ed] bg-[radial-gradient(ellipse_at_90%_50%,rgba(190,237,228,0.55),transparent_58%),linear-gradient(110deg,#f3fbf9,#eaf8f5)] px-5 py-[17px] max-[600px]:px-3.5">
      <span className="inline-flex text-[#078b8d]">
        <Icon name="sparkles" size={16} />
      </span>
      <h2 className="mt-2 text-[13px] font-bold text-[#344749]">
        How matching works
      </h2>
      <p className="mt-1.5 text-[10px] leading-5 text-[#77888a]">
        Scores use only the interests, skills, locations, and setup preferences
        you’ve shared.
      </p>
    </section>
  );
}
