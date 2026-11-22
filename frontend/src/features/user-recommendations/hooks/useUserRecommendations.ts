import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { RecommendedJob } from "@/components/common/user/recommendationComponents";
import { useAuth } from "@/features/auth/useAuth";
import { getJobMatch } from "@/features/jobs/jobMatching";
import type { JobListing } from "@/features/jobs/jobListings";
import { getOjtMatch } from "@/features/jobs/ojtMatching";
import type { OjtOpportunity, ScoredOjtOpportunity } from "@/features/jobs/ojtMatching";
import { formatListingPay, listingText, publicJobsApi, type PublicJobListing } from "@/features/jobs/backendApi";
import { onboardingStore } from "@/features/onboarding/store";
import { savedOpportunityStore } from "@/features/jobs/savedOpportunities";

export type RecommendationSort = "best-match" | "most-recent";

export type CombinedRecommendation =
  | {
      type: "job";
      key: string;
      score: number;
      postedHoursAgo: number;
      job: RecommendedJob;
    }
  | {
      type: "ojt";
      key: string;
      score: number;
      postedHoursAgo: number;
      opportunity: ScoredOjtOpportunity;
    };

function toRecommendedListing(listing: PublicJobListing): JobListing {
  const company = listing.company?.name ?? "Company unavailable";
  const publishedAt = listing.published_at ? new Date(listing.published_at) : null;
  const hoursSincePublished =
    publishedAt && !Number.isNaN(publishedAt.getTime())
      ? Math.max(0, Math.floor((Date.now() - publishedAt.getTime()) / 3_600_000))
      : 0;

  return {
    id: String(listing.id),
    listingId: listing.id,
    company,
    initials: company.slice(0, 1).toUpperCase(),
    title: listing.title,
    category: listing.category?.name ?? "Uncategorized",
    location: listing.location,
    countryCode: "",
    country: "",
    city: listing.company?.city ?? "",
    arrangement:
      listing.work_setup === "onsite"
        ? "On-site"
        : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
    employmentType:
      listing.employment_type
        ? ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract" } as const)[listing.employment_type]
        : "Not specified",
    salary: formatListingPay(listing),
    posted: publishedAt && !Number.isNaN(publishedAt.getTime())
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
          -Math.max(1, hoursSincePublished >= 24 ? Math.floor(hoursSincePublished / 24) : hoursSincePublished),
          hoursSincePublished >= 24 ? "day" : "hour",
        )
      : "Date not available",
    postedHoursAgo: hoursSincePublished,
    description: listing.description,
    skills: listingText(listing.requirements),
  };
}

function toOjtOpportunity(listing: PublicJobListing): OjtOpportunity {
  const company = listing.company?.name ?? "Company unavailable";
  const publishedAt = listing.published_at ? new Date(listing.published_at) : null;
  let posted = "Date not available";
  if (publishedAt && !Number.isNaN(publishedAt.getTime())) {
    const hours = Math.max(0, Math.floor((Date.now() - publishedAt.getTime()) / 3_600_000));
    const amount = hours >= 24 ? Math.max(1, Math.floor(hours / 24)) : Math.max(1, hours);
    posted = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      -amount,
      hours >= 24 ? "day" : "hour",
    );
  }

  return {
    id: String(listing.id),
    company,
    initials: company.slice(0, 1).toUpperCase(),
    title: listing.title,
    trainingFields: listing.category?.name ? [listing.category.name] : [],
    location: listing.location,
    city: listing.company?.city ?? "",
    countryCode: "",
    hoursCapacity: listing.ojt?.duration_hours ?? null,
    moaAvailable: listing.ojt?.moa_accepted ?? null,
    eligibleCourses: listing.ojt?.accepted_courses ?? [],
    workSetup:
      listing.work_setup === "onsite"
        ? "Onsite"
        : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
    employmentType: "Internship",
    allowance:
      listing.ojt?.allowance_type === "unpaid"
        ? "Unpaid"
        : listing.ojt?.allowance_amount == null
          ? ""
          : `₱${listing.ojt.allowance_amount.toLocaleString()} allowance`,
    skills: listingText(listing.requirements),
    posted,
    description: listing.description,
  };
}

function getPostedHoursAgo(posted: string) {
  if (posted.toLocaleLowerCase() === "today") return 0;
  const match = posted.match(/^(\d+)\s+(hour|day|week)s?\s+ago$/i);
  if (!match) return Number.POSITIVE_INFINITY;

  const amount = Number(match[1]);
  const unit = match[2].toLocaleLowerCase();
  return amount * (unit === "hour" ? 1 : unit === "day" ? 24 : 168);
}

export function useUserRecommendations() {
  const { user } = useAuth();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [sort, setSort] = useState<RecommendationSort>("best-match");
  const [showSavedOnly, setShowSavedOnly] = useState(
    () => new URLSearchParams(window.location.search).get("saved") === "1",
  );

  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const answers = onboarding.answers;
  const savedOpportunities = useSyncExternalStore(
    savedOpportunityStore.subscribe,
    savedOpportunityStore.getSnapshot,
    () => [],
  );
  const [apiJobs, setApiJobs] = useState<JobListing[]>([]);
  const [apiOjtOpportunities, setApiOjtOpportunities] = useState<OjtOpportunity[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      publicJobsApi.list({ listing_type: "job", per_page: 50 }),
      publicJobsApi.list({ listing_type: "ojt", per_page: 50 }),
    ])
      .then(([jobs, ojts]) => {
        if (!active) return;
        setApiJobs(jobs.data.map(toRecommendedListing));
        setApiOjtOpportunities(ojts.data.map(toOjtOpportunity));
      })
      .catch(() => {
        if (!active) return;
        setApiJobs([]);
        setApiOjtOpportunities([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasJobSeekerPreferences =
    onboarding.isComplete &&
    answers.goal === "job-seeker" &&
    (answers.desiredJobTitles.length > 0 ||
      answers.skills.length > 0 ||
      answers.jobCategories.length > 0 ||
      Boolean(answers.workSetup) ||
      answers.preferredLocations.length > 0);

  const recommendations = useMemo(() => {
    const matchingJobs: RecommendedJob[] = apiJobs.map((job) => {
      const match = hasJobSeekerPreferences ? getJobMatch(job, answers) : null;
      return {
        ...job,
        matchScore: match?.score ?? 0,
        matchReasons: match?.reasons ?? [],
      };
    });

    return matchingJobs.sort((left, right) =>
      sort === "most-recent"
        ? left.postedHoursAgo - right.postedHoursAgo
        : (right.matchScore ?? -1) - (left.matchScore ?? -1),
    );
  }, [answers, apiJobs, hasJobSeekerPreferences, sort]);

  const ojtRecommendations = useMemo(() => {
    return apiOjtOpportunities
      .map((opportunity) => getOjtMatch(opportunity, answers))
      .filter((opportunity) => opportunity !== null)
      .sort((left, right) => right.matchScore - left.matchScore);
  }, [answers, apiOjtOpportunities]);

  const combinedRecommendations = useMemo(() => {
    const combined: CombinedRecommendation[] = [
      ...recommendations.map((job) => ({
        type: "job" as const,
        key: `job-${job.id}`,
        score: job.matchScore ?? 0,
        postedHoursAgo: job.postedHoursAgo,
        job,
      })),
      ...ojtRecommendations.map((opportunity) => ({
        type: "ojt" as const,
        key: `ojt-${opportunity.id}`,
        score: opportunity.matchScore,
        postedHoursAgo: getPostedHoursAgo(opportunity.posted),
        opportunity,
      })),
    ];

    return combined.sort((left, right) =>
      sort === "most-recent"
        ? left.postedHoursAgo - right.postedHoursAgo
        : right.score - left.score,
    );
  }, [ojtRecommendations, recommendations, sort]);

  const visibleRecommendations = useMemo(
    () =>
      showSavedOnly
        ? combinedRecommendations.filter((recommendation) =>
            savedOpportunities.includes(
              `${recommendation.type}:${recommendation.type === "job" ? recommendation.job.id : recommendation.opportunity.id}`,
            ),
          )
        : combinedRecommendations,
    [combinedRecommendations, savedOpportunities, showSavedOnly],
  );

  const bestMatchJobId =
    visibleRecommendations[0]?.type === "job" &&
    visibleRecommendations[0].job.matchScore !== null &&
    visibleRecommendations[0].job.matchScore >= 70
      ? visibleRecommendations[0].job.id
      : null;

  const firstName =
    (user?.name || answers.name).trim().split(/\s+/)[0] || "there";
  const verificationEmail =
    user && !user.email_verified_at
      ? user.email
      : onboarding.accountCreated && !user
        ? answers.email
        : "";

  return {
    bestMatchJobId,
    combinedRecommendations,
    firstName,
    hasJobSeekerPreferences,
    noticeDismissed,
    ojtRecommendations,
    recommendations,
    setNoticeDismissed,
    setShowSavedOnly,
    setSort,
    showSavedOnly,
    sort,
    user,
    verificationEmail,
    visibleRecommendations,
    savedOpportunities,
  };
}
