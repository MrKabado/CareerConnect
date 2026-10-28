import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";

export type OjtOpportunity = {
  id: string;
  company: string;
  initials: string;
  title: string;
  trainingFields: string[];
  location: string;
  city: string;
  countryCode: string;
  hoursCapacity: number;
  moaAvailable: boolean;
  eligibleCourses: string[];
  workSetup: string;
  employmentType: "Internship";
  allowance: string;
  skills: string[];
  posted: string;
  description: string;
};

export type ScoredOjtOpportunity = OjtOpportunity & {
  matchScore: number;
  matchReasons: string[];
  requiredHours: number | null;
};

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
  isTopMatch,
}: {
  opportunity: ScoredOjtOpportunity;
  isTopMatch: boolean;
}) {
  const navigate = useNavigate();

  return (
    <article
      aria-label={`View ${opportunity.company} company profile`}
      className={`cursor-pointer overflow-hidden rounded-[13px] border bg-white shadow-[0_3px_10px_rgba(39,85,82,0.025)] transition-[border-color,box-shadow] hover:border-[#b9dcda] hover:shadow-[0_7px_18px_rgba(39,85,82,0.07)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${
        isTopMatch
          ? "border-[#b9dcda] shadow-[0_5px_16px_rgba(39,85,82,0.07)]"
          : "border-[#e8eeee]"
      }`}
      onClick={() => navigate(getCompanyProfileUrl(opportunity.company))}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(getCompanyProfileUrl(opportunity.company));
        }
      }}
      role="link"
      tabIndex={0}
    >
      {isTopMatch && (
        <div className="flex items-center justify-between border-b border-[#e4f2ef] bg-[#f1faf8] px-3 py-2 text-[9px] font-medium text-[#32817e]">
          <span>✦ Recommended from your onboarding preferences</span>
          <span className="rounded-full bg-[#def3ef] px-2 py-1 font-bold text-[#087f78]">
            {opportunity.matchScore}% match
          </span>
        </div>
      )}
      <div className="flex items-start gap-3 px-[15px] py-[14px]">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#078b8d] text-[13px] font-bold text-white">
          {opportunity.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-[12px] font-bold text-[#2b3e3f]">
                  {opportunity.title}
                </h3>
                <span className="rounded bg-[#fff0dc] px-1.5 py-0.5 text-[8px] font-semibold text-[#bd852d]">
                  OJT
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium text-[#647779]">
                {opportunity.company}
              </p>
            </div>
            {!isTopMatch && (
              <span className="whitespace-nowrap rounded-full bg-[#eff6f5] px-2 py-1 text-[9px] font-semibold text-[#54797a]">
                {opportunity.matchScore}% match
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[9px] text-[#778789]">
            <InfoIcon icon="pin">{opportunity.location}</InfoIcon>
            <InfoIcon icon="briefcase">{opportunity.workSetup}</InfoIcon>
            <span>{opportunity.allowance}</span>
          </div>
          <p className="my-2 text-[9px] leading-[1.5] text-[#748385]">
            {opportunity.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-[4px] bg-[#eff6f5] px-2 py-1 text-[8px] font-medium text-[#54797a]">
              {opportunity.requiredHours
                ? `${opportunity.requiredHours} hours`
                : `Up to ${opportunity.hoursCapacity} hours`}
            </span>
            {opportunity.moaAvailable && (
              <span className="rounded-[4px] bg-[#fff4df] px-2 py-1 text-[8px] font-semibold text-[#a9792a]">
                MOA supported
              </span>
            )}
            {opportunity.skills.map((skill) => (
              <span
                className="rounded-[4px] bg-[#eff6f5] px-2 py-1 text-[8px] font-medium text-[#54797a]"
                key={skill}
              >
                {skill}
              </span>
            ))}
            <span className="ml-auto self-center whitespace-nowrap text-[8px] text-[#9aa6a7]">
              {opportunity.posted}
            </span>
          </div>
          {opportunity.matchReasons.length > 0 && (
            <div className="mt-2 border-t border-[#edf1f1] pt-2">
              <p className="text-[8px] font-semibold text-[#748789]">
                Why it matches:{" "}
                <span className="font-normal text-[#198a84]">
                  {opportunity.matchReasons.join(" · ")}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
