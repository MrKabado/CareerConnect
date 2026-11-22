import type { ApplicantProfileData } from "@/features/user-profile/backendApi";
import type { JobListing } from "@/features/jobs/jobListings";

type MatchFactor = {
  label: string;
  score: number;
};

export type JobMatch = {
  score: number;
  reasons: string[];
};

const experienceLowerBounds: Record<string, number> = {
  fresh_graduate: 0,
  "1_3_years": 1,
  "3_5_years": 3,
  "5_plus_years": 5,
};

function normalizedWords(value: string): string[] {
  return value.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function normalizedTerm(value: string): string {
  return normalizedWords(value).join(" ").replace(/\bon site\b/g, "onsite");
}

function overlapScore(left: string, right: string): number {
  const leftWords = new Set(normalizedWords(left));
  const rightWords = new Set(normalizedWords(right));
  if (leftWords.size === 0 || rightWords.size === 0) return 0;

  const sharedWords = [...leftWords].filter((word) => rightWords.has(word)).length;
  return sharedWords / new Set([...leftWords, ...rightWords]).size;
}

export function textSimilarity(left: string, right: string): number {
  const leftWords = new Set(
    left.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [],
  );
  const rightWords = new Set(
    right.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [],
  );
  const smallerSetSize = Math.min(leftWords.size, rightWords.size);

  if (smallerSetSize === 0) return 0;

  const sharedWords = [...leftWords].filter((word) => rightWords.has(word)).length;
  return sharedWords / smallerSetSize;
}

export function getApplicantExperienceLowerBound(experienceLevel: string | null): number | null {
  return experienceLevel === null ? null : experienceLowerBounds[experienceLevel] ?? null;
}

export function hasJobMatchingProfile(profile: ApplicantProfileData): boolean {
  return profile.skills.length > 0
    || profile.interests.length > 0
    || (profile.other_categories?.length ?? 0) > 0
    || (profile.desired_titles?.length ?? 0) > 0
    || (profile.preferred_locations?.length ?? 0) > 0
    || (profile.work_setups?.length ?? 0) > 0
    || (profile.employment_types?.length ?? 0) > 0
    || profile.experience_level !== null
    || Boolean(profile.ojt_details?.course);
}

export function getJobEligibilityFailure(
  job: Pick<JobListing, "requiredSkills" | "experienceRequired" | "minimumExperienceYears">,
  profile: ApplicantProfileData,
): string | null {
  const failures: string[] = [];
  const applicantSkills = new Set(profile.skills.map(normalizedTerm));
  const missingSkills = job.requiredSkills.filter(
    (skill) => !applicantSkills.has(normalizedTerm(skill)),
  );

  if (missingSkills.length > 0) {
    failures.push(`Missing required skills: ${missingSkills.join(", ")}.`);
  }

  if (job.experienceRequired) {
    const minimumYears = job.minimumExperienceYears ?? 1;
    const reportedYears = getApplicantExperienceLowerBound(profile.experience_level);
    if (reportedYears === null) {
      failures.push(`Add your work experience to your profile. This job requires at least ${minimumYears} years of experience.`);
    } else if (reportedYears < minimumYears) {
      failures.push(`This job requires at least ${minimumYears} years of experience, but your profile indicates at least ${reportedYears}.`);
    }
  }

  return failures.length > 0 ? `You do not meet this job listing's qualifications. ${failures.join(" ")}` : null;
}

function getEducationScore(job: JobListing, profile: ApplicantProfileData): number {
  const requirements = normalizedWords(job.requirementsText);
  const hasExplicitEducationRequirement = /\b(bachelor|degree|diploma|master|university|college)\b/i
    .test(job.requirementsText);
  if (!hasExplicitEducationRequirement) return 0;

  const courseWords = normalizedWords(profile.ojt_details?.course ?? "");
  const courseMatches = courseWords.length > 0 && courseWords.every((word) => requirements.includes(word));
  const requiresGraduation = /\b(bachelor|degree|diploma|master)\b/i.test(job.requirementsText)
    && !/\b(undergraduate|currently pursuing|student)\b/i.test(job.requirementsText);
  const hasRequiredEducationStatus = !requiresGraduation
    || profile.ojt_details?.education_status === "graduated";

  return courseMatches && hasRequiredEducationStatus ? 1 : 0;
}

export function getJobMatch(
  job: JobListing,
  profile: ApplicantProfileData,
): { score: number; reasons: string[] } | null {
  const interests = [
    ...profile.interests.map((interest) => interest.name),
    ...(profile.other_categories ?? []),
  ];
  const desiredTitles = profile.desired_titles ?? [];
  const preferredLocations = profile.preferred_locations ?? [];
  const workSetups = profile.work_setups ?? [];
  const employmentTypes = profile.employment_types ?? [];
  if (!hasJobMatchingProfile(profile)) return null;

  const factors: MatchFactor[] = [
    {
      label: "job category",
      score: Math.max(0, ...interests.map((interest) => overlapScore(interest, job.category))),
    },
  ];

  if (job.requiredSkills.length > 0) {
    const applicantSkills = new Set(profile.skills.map(normalizedTerm));
    factors.push({
      label: "required skills",
      score: job.requiredSkills.filter((skill) => applicantSkills.has(normalizedTerm(skill))).length
        / job.requiredSkills.length,
    });
  }

  if (job.experienceRequired) {
    const reportedYears = getApplicantExperienceLowerBound(profile.experience_level) ?? 0;
    factors.push({
      label: "required experience",
      score: Math.min(1, reportedYears / (job.minimumExperienceYears ?? 1)),
    });
  }

  if (/\b(bachelor|degree|diploma|master|university|college)\b/i.test(job.requirementsText)) {
    factors.push({ label: "education", score: getEducationScore(job, profile) });
  }

  if (desiredTitles.length > 0) {
    factors.push({
      label: "desired role",
      score: Math.max(0, ...desiredTitles.map((title) => overlapScore(title, job.title))),
    });
  }

  if (preferredLocations.length > 0) {
    factors.push({
      label: "preferred location",
      score: Math.max(0, ...preferredLocations.map((location) =>
        overlapScore(location, `${job.location} ${job.city}`),
      )),
    });
  }

  if (workSetups.length > 0) {
    factors.push({
      label: "work setup",
      score: workSetups.some((setup) => normalizedTerm(setup) === normalizedTerm(job.arrangement)) ? 1 : 0,
    });
  }

  if (employmentTypes.length > 0) {
    factors.push({
      label: "employment type",
      score: employmentTypes.some((type) => normalizedTerm(type) === normalizedTerm(job.employmentType)) ? 1 : 0,
    });
  }

  if (
    profile.salary_min !== null
    && profile.salary_max !== null
    && job.salaryMin != null
    && job.salaryMax != null
  ) {
    factors.push({
      label: "salary range",
      score: Math.max(profile.salary_min, job.salaryMin) <= Math.min(profile.salary_max, job.salaryMax) ? 1 : 0,
    });
  }

  return {
    score: Math.round(factors.reduce((total, factor) => total + factor.score, 0) / factors.length * 100),
    reasons: factors.filter((factor) => factor.score > 0).map((factor) => factor.label),
  };
}
