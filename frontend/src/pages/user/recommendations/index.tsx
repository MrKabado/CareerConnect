import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import ApplicationStatusList from "@/components/common/user/applicationStatusList";
import {
  EmailVerificationNotice,
  MatchingExplainer,
  PreferencesSummary,
  RecommendedJobCard,
  type RecommendedJob,
} from "@/components/common/user/recommendationComponents";
import { jobListings } from "@/features/jobs/jobListings";
import { getJobMatch } from "@/features/jobs/jobMatching";
import { useAuth } from "@/features/auth/useAuth";
import { onboardingStore } from "@/features/onboarding/store";

type RecommendationSort = "best-match" | "most-recent";

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [sort, setSort] = useState<RecommendationSort>("best-match");
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const answers = onboarding.answers;
  const hasJobSeekerPreferences =
    onboarding.isComplete &&
    answers.goal === "job-seeker" &&
    (answers.desiredJobTitles.length > 0 ||
      answers.skills.length > 0 ||
      answers.jobCategories.length > 0 ||
      Boolean(answers.workSetup) ||
      answers.preferredLocations.length > 0);

  const recommendations = useMemo(() => {
    const matchingJobs: RecommendedJob[] = jobListings.map((job) => {
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
  }, [answers, hasJobSeekerPreferences, sort]);

  const bestMatch = recommendations.reduce<RecommendedJob | null>(
    (best, job) =>
      job.matchScore !== null &&
      job.matchScore >= 70 &&
      (best === null || job.matchScore > (best.matchScore ?? 0))
        ? job
        : best,
    null,
  );
  const preferenceTags = [
    ...answers.jobCategories,
    ...answers.desiredJobTitles,
    answers.workSetup,
    ...answers.preferredLocations,
    ...answers.employmentTypes,
  ].filter(Boolean);
  const firstName =
    (user?.name || answers.name).trim().split(/\s+/)[0] || "Jamie";
  const verificationEmail =
    user && !user.email_verified_at
      ? user.email
      : onboarding.accountCreated && !user
        ? answers.email
        : "";

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="flex-1">
        <section className="border-b border-[#deeeeb] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] px-10 pt-9 pb-8 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-6">
          <div className="mx-auto max-w-[1136px]">
            {verificationEmail && !noticeDismissed && (
              <EmailVerificationNotice
                email={verificationEmail}
                onDismiss={() => setNoticeDismissed(true)}
              />
            )}

            <section className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f4f1] px-2.5 py-1 text-[12px] font-semibold text-[#25827e]">
                  <span aria-hidden="true">✦</span>
                  Personalized for you
                </span>
                <h1 className="mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.8px] text-[#293d3e] max-[680px]:text-[24px]">
                  Good day, {firstName}
                </h1>
                <p className="mt-1.5 text-[12px] text-[#7b8b8d]">
                  Fresh opportunities matched to your goals, skills, and preferred
                  work setup.
                </p>
              </div>
              <div
                aria-label="Recommendation view"
                className="inline-flex rounded-[9px] border border-[#e5eeee] bg-white p-1"
              >
                <span
                  aria-current="page"
                  className="rounded-[7px] bg-[#078b8d] px-3 py-1.5 text-[10px] font-semibold text-white"
                >
                  Recommended
                </span>
                <Link
                  className="rounded-[7px] px-3 py-1.5 text-[10px] font-semibold text-[#728385] hover:bg-[#f1f8f7] hover:text-[#087879] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-1"
                  to="/job-search"
                >
                  All listings
                </Link>
              </div>
            </section>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1136px] px-10 pt-7 pb-8 max-[920px]:px-6 max-[680px]:px-4">
        <section aria-labelledby="best-matches-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                className="text-[17px] font-bold tracking-[-0.25px] text-[#344749]"
                id="best-matches-heading"
              >
                Best matches
              </h2>
              <p className="mt-1 text-[10px] text-[#92a0a1]">
                {recommendations.length} opportunities
                {hasJobSeekerPreferences
                  ? " · ranked using your job-seeker profile"
                  : " · complete your profile for personalized matches"}
              </p>
            </div>
            <label className="relative flex w-[152px] items-center">
              <span className="sr-only">Sort recommendations</span>
              <select
                className="h-9 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[29px] pl-3 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
                onChange={(event) =>
                  setSort(
                    event.target.value === "most-recent"
                      ? "most-recent"
                      : "best-match",
                  )
                }
                value={sort}
              >
                <option value="best-match">Best match</option>
                <option value="most-recent">Most recent</option>
              </select>
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute right-[10px] size-[15px] text-[#849394]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-[14px]">
            {recommendations.map((job) => (
              <RecommendedJobCard
                isBestMatch={bestMatch?.id === job.id}
                job={job}
                key={job.id}
              />
            ))}
            {recommendations.length === 0 && (
              <div className="rounded-[13px] border border-dashed border-[#cadbda] bg-white px-5 py-[50px] text-center">
                <h3 className="text-[15px] font-semibold text-[#203638]">
                  No matching opportunities
                </h3>
                <p className="mt-1 text-xs text-[#718184]">
                  Check back soon for new opportunities.
                </p>
              </div>
            )}
          </div>
        </section>

        <ApplicationStatusList />

        <div className="mt-4">
          <PreferencesSummary tags={preferenceTags} />
        </div>
        <div className="mt-4">
          <MatchingExplainer />
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
