import type { OnboardingAnswers } from "@/features/onboarding/store";
import { textSimilarity } from "@/features/jobs/jobMatching";

export type OjtOpportunity = {
  id: string;
  company: string;
  initials: string;
  title: string;
  trainingFields: string[];
  location: string;
  city: string;
  countryCode: string;
  hoursCapacity: number | null;
  moaAvailable: boolean | null;
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
  requiredHours: number | null;
};

export function getOjtMatch(
  opportunity: OjtOpportunity,
  answers: OnboardingAnswers,
): ScoredOjtOpportunity | null {
  const fieldMatch =
    answers.trainingFields.length === 0 ||
    answers.trainingFields.some((field) =>
      opportunity.trainingFields.some(
        (opportunityField) => textSimilarity(field, opportunityField) > 0,
      ),
    );
  const hasLocation = Boolean(opportunity.location || opportunity.city);
  const locationMatch =
    !hasLocation ||
    answers.preferredLocations.length === 0 ||
    answers.preferredLocations.some(
      (location) =>
        textSimilarity(location, opportunity.city) > 0 ||
        textSimilarity(location, opportunity.location) > 0,
    );

  if (!fieldMatch || !locationMatch) return null;

  const requiredHours = Number(answers.requiredOjtHours);
  const hoursFit =
    !requiredHours ||
    opportunity.hoursCapacity === null ||
    opportunity.hoursCapacity >= requiredHours;
  const course = answers.course.trim().toLocaleLowerCase();
  const courseEligible =
    !course ||
    opportunity.eligibleCourses.length === 0 ||
    opportunity.eligibleCourses.some(
      (eligibleCourse) =>
        course.includes(eligibleCourse) || eligibleCourse.includes(course),
    );
  const moaFit = !answers.requiresMoa || opportunity.moaAvailable;
  const workSetupMatch =
    textSimilarity(answers.workSetup, opportunity.workSetup) === 1;
  const paidOnlyPreference = answers.allowancePreference
    .toLocaleLowerCase()
    .includes("paid only");
  const allowanceKnown = Boolean(opportunity.allowance);
  const allowanceFit =
    !paidOnlyPreference ||
    !allowanceKnown ||
    /\bpaid\b|₱|stipend/i.test(opportunity.allowance);
  const skillMatchScore =
    answers.skills.length === 0 || opportunity.skills.length === 0
      ? null
      : answers.skills.filter((skill) =>
          opportunity.skills.some(
            (opportunitySkill) => textSimilarity(skill, opportunitySkill) > 0,
          ),
        ).length / answers.skills.length;
  const factors = [
    { weight: 35, score: fieldMatch ? 1 : 0 },
    ...(hasLocation && answers.preferredLocations.length > 0
      ? [{ weight: 30, score: locationMatch ? 1 : 0 }]
      : []),
    ...(requiredHours && opportunity.hoursCapacity !== null
      ? [{ weight: 15, score: hoursFit ? 1 : 0 }]
      : []),
    ...(course && opportunity.eligibleCourses.length > 0
      ? [{ weight: 10, score: courseEligible ? 1 : 0 }]
      : []),
    ...(answers.requiresMoa && opportunity.moaAvailable !== null
      ? [{ weight: 10, score: moaFit ? 1 : 0 }]
      : []),
    ...(answers.workSetup && opportunity.workSetup
      ? [{ weight: 5, score: workSetupMatch ? 1 : 0 }]
      : []),
    ...(paidOnlyPreference && allowanceKnown
      ? [{ weight: 5, score: allowanceFit ? 1 : 0 }]
      : []),
    ...(skillMatchScore !== null
      ? [{ weight: 10, score: skillMatchScore }]
      : []),
  ];
  const totalWeight = factors.reduce((total, factor) => total + factor.weight, 0);
  const matchScore = Math.round(
    (factors.reduce(
      (total, factor) => total + factor.weight * factor.score,
      0,
    ) /
      totalWeight) *
      100,
  );

  return {
    ...opportunity,
    matchScore,
    requiredHours: requiredHours || null,
  };
}