const sharedSteps = [
  {
    id: "goal",
    eyebrow: "Applicant profile",
    title: "What are you looking for?",
    description:
      "We’ll personalize your setup and recommendations based on your goal.",
  },
  {
    id: "create-account",
    eyebrow: "Applicant profile",
    title: "Create your account",
    description: "Use an email you check often so employers can reach you.",
  },
] as const;

const ojtSteps = [
  {
    id: "school",
    eyebrow: "OJT profile",
    title: "Tell us about your school",
    description:
      "These details help us match you with eligible training opportunities.",
  },
  {
    id: "interests",
    eyebrow: "OJT profile",
    title: "What do you want to learn?",
    description: "Choose the fields and skills you want to develop.",
  },
  {
    id: "preferences",
    eyebrow: "OJT profile",
    title: "Set your OJT preferences",
    description: "Tell us what works for your school schedule and training goals.",
  },
  {
    id: "resume",
    eyebrow: "Optional",
    title: "Add your resume",
    description:
      "A resume helps employers understand your experience and improves your recommendations.",
  },
  {
    id: "review",
    eyebrow: "OJT profile",
    title: "Review your profile",
    description:
      "Check your answers before we create your personalized experience.",
  },
] as const;

const jobSteps = [
  {
    id: "job-interests",
    eyebrow: "Applicant profile",
    title: "Choose your interests",
    description:
      "Select up to five categories to shape your recommendations.",
  },
  {
    id: "job-skills",
    eyebrow: "Applicant profile",
    title: "Tell us what you do best",
    description: "Add the roles and skills you want to use in your next job.",
  },
  {
    id: "job-preferences",
    eyebrow: "Applicant profile",
    title: "Set your work preferences",
    description: "Tell us which opportunities will work best for you.",
  },
  {
    id: "resume",
    eyebrow: "Optional",
    title: "Add your resume",
    description:
      "A resume helps employers understand your experience and improves your recommendations.",
  },
  {
    id: "review",
    eyebrow: "Applicant profile",
    title: "Review your profile",
    description:
      "Check your answers before we create your personalized experience.",
  },
] as const;

export const onboardingSteps = [...sharedSteps, ...ojtSteps] as const;
export const jobOnboardingSteps = [...sharedSteps, ...jobSteps] as const;
export const onboardingTotalSteps = onboardingSteps.length;

export type OnboardingStepId =
  | (typeof onboardingSteps)[number]["id"]
  | (typeof jobOnboardingSteps)[number]["id"];

export function getOnboardingSteps(goal: "job-seeker" | "ojt-seeker" | "") {
  return goal === "job-seeker" ? jobOnboardingSteps : onboardingSteps;
}

export function getStepIndex(
  stepId: OnboardingStepId,
  goal: "job-seeker" | "ojt-seeker" | "",
) {
  return getOnboardingSteps(goal).findIndex((step) => step.id === stepId);
}
