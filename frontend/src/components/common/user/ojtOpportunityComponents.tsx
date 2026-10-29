import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";
import type { ScoredOjtOpportunity } from "@/features/jobs/ojtMatching";
import { savedOpportunityStore } from "@/features/jobs/savedOpportunities";
import { useSyncExternalStore } from "react";

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3"
      fill="none"
      viewBox="0 0 16 16"
    >
      <rect
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
        width="10"
        x="3"
        y="7"
      />
      <path
        d="M5 7V5a3 3 0 0 1 6 0v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function PreferenceFilter({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[#718184]">
        {label} <LockIcon />
        <span className="text-[9px] font-normal text-[#9aa7a7]">
          From your OJT profile
        </span>
      </p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              className="rounded-md border border-[#dcebea] bg-[#f3faf9] px-2 py-1 text-[10px] font-medium text-[#477779]"
              key={value}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[#dce6e5] px-2.5 py-2 text-[10px] text-[#9aa7a7]">
          Set during OJT onboarding
        </p>
      )}
    </div>
  );
}

export function LockedOjtFilters({
  locations,
  categories,
}: {
  locations: string[];
  categories: string[];
}) {
  return (
    <div className="space-y-4">
      <PreferenceFilter label="Location" values={locations} />
      <PreferenceFilter label="Category" values={categories} />
      <p className="text-[9px] leading-4 text-[#9aa7a7]">
        Update your OJT profile to change these recommendations.
      </p>
    </div>
  );
}

function InfoIcon({
  children,
  icon,
}: {
  children: ReactNode;
  icon: "pin" | "briefcase";
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon === "pin" ? (
        <svg
          aria-hidden="true"
          className="size-3.5"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            d="M13 6.7c0 3.2-5 7.3-5 7.3S3 9.9 3 6.7a5 5 0 1 1 10 0Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="6.5" r="1.4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="size-3.5"
          fill="none"
          viewBox="0 0 16 16"
        >
          <rect
            height="9"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
            width="12"
            x="2"
            y="5"
          />
          <path
            d="M5 5V3.5A1.5 1.5 0 0 1 6.5 2h3A1.5 1.5 0 0 1 11 3.5V5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      )}
      {children}
    </span>
  );
}

export function OjtOpportunityCard({
  opportunity,
  showMatchScore = false,
}: {
  opportunity: ScoredOjtOpportunity;
  showMatchScore?: boolean;
}) {
  const navigate = useNavigate();
  const isSaved = useSyncExternalStore(
    savedOpportunityStore.subscribe,
    () => savedOpportunityStore.isSaved("ojt", opportunity.id),
    () => false,
  );

  return (
    <article
      aria-label={`View ${opportunity.company} company profile`}
      className="cursor-pointer overflow-hidden rounded-[14px] border border-[#dcebea] bg-white shadow-[0_3px_10px_rgba(39,85,82,0.025)] transition-[border-color,box-shadow] hover:border-[#b9dcda] hover:shadow-[0_7px_18px_rgba(39,85,82,0.07)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
      onClick={() => navigate(getCompanyProfileUrl(opportunity.company))}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          navigate(getCompanyProfileUrl(opportunity.company));
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="ml-[17px] mt-[18px] grid size-[42px] shrink-0 place-items-center rounded-[10px] border border-[#e5efed] bg-[#078b8d] text-[16px] font-bold text-white max-[600px]:ml-3 max-[600px]:mt-3 max-[600px]:size-[34px]">
          {opportunity.initials}
        </div>
        <div className="min-w-0 flex-1 py-[17px] pr-[17px] max-[600px]:py-3 max-[600px]:pr-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-[17px] font-bold tracking-[-0.15px] text-[#2b3e3f] max-[600px]:text-[14px]">
                  {opportunity.title}
                </h3>
                <span className="rounded bg-[#fff0dc] px-1.5 py-0.5 text-[8px] font-semibold text-[#bd852d]">
                  OJT
                </span>
              </div>
              <p className="mt-1 text-[13px] font-medium text-[#647779] max-[600px]:text-[11px]">
                {opportunity.company}
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              {showMatchScore && (
                <span
                  aria-label={`${opportunity.matchScore}% match`}
                  className="whitespace-nowrap rounded-full bg-[#eff6f5] px-2 py-1 text-[9px] font-semibold text-[#54797a]"
                >
                  {opportunity.matchScore}% match
                </span>
              )}
              <button
                aria-label={
                  isSaved
                    ? `Remove ${opportunity.title} from saved jobs`
                    : `Save ${opportunity.title}`
                }
                aria-pressed={isSaved}
                className={`mt-1 rounded p-1 text-[#829294] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${isSaved ? "bg-[#eaf6ed] text-[#27834b] [&_svg]:fill-[#bfe7c8]" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  savedOpportunityStore.toggle("ojt", opportunity.id);
                }}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 4h12v17l-6-4-6 4V4Z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-[7px] text-[12px] text-[#778789] max-[600px]:text-[9px]">
            {opportunity.location && (
              <span className="inline-flex items-center gap-1">
                <InfoIcon icon="pin">{opportunity.location}</InfoIcon>
              </span>
            )}
            {opportunity.workSetup && (
              <span className="inline-flex items-center gap-1">
                <InfoIcon icon="briefcase">{opportunity.workSetup}</InfoIcon>
              </span>
            )}
            {opportunity.allowance && (
              <span className="font-semibold text-[#1b7776] max-[680px]:basis-full">
                {opportunity.allowance}
              </span>
            )}
          </div>
          {opportunity.description && (
            <p className="my-2 text-[12px] leading-[1.45] text-[#748385] max-[600px]:text-[10px]">
              {opportunity.description}
            </p>
          )}
          <div className="flex flex-wrap gap-[5px]">
            <span className="rounded-[4px] bg-[#eff6f5] px-[7px] py-1 text-[11px] font-medium text-[#54797a] max-[600px]:text-[9px]">
              {opportunity.requiredHours
                ? `${opportunity.requiredHours} hours`
                : opportunity.hoursCapacity !== null
                  ? `Up to ${opportunity.hoursCapacity} hours`
                  : "Hours not specified"}
            </span>
            {opportunity.moaAvailable && (
              <span className="rounded-[4px] bg-[#fff4df] px-[7px] py-1 text-[11px] font-semibold text-[#a9792a] max-[600px]:text-[9px]">
                MOA supported
              </span>
            )}
            {opportunity.skills.map((skill) => (
              <span
                className="rounded-[4px] bg-[#eff6f5] px-[7px] py-1 text-[11px] font-medium text-[#54797a] max-[600px]:text-[9px]"
                key={skill}
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="mt-[9px] flex items-center justify-between gap-2 border-t border-[#edf1f1] pt-2">
            <span className="text-[10px] font-semibold text-[#078b8d]">
              OJT opportunity
            </span>
            <span className="whitespace-nowrap text-[9px] text-[#9aa6a7]">
              {opportunity.posted}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
