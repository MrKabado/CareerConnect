import type { OnboardingStepId } from "@/features/onboarding/config/steps";
import type { OnboardingAnswers } from "@/features/onboarding/store";

export type OnboardingField = keyof OnboardingAnswers;
export type OnboardingErrors = Partial<Record<OnboardingField, string>>;

export const onboardingSchemas: Record<
  OnboardingStepId,
  (answers: OnboardingAnswers) => OnboardingErrors
> = {
  goal: (answers) =>
    answers.goal ? {} : { goal: "Choose the opportunity you’re looking for." },
  "create-account": (answers) => {
    const errors: OnboardingErrors = {};

    if (!answers.name.trim()) {
      errors.name = "Enter your full name.";
    } else if (answers.name.trim().length > 255) {
      errors.name = "Your name must be 255 characters or fewer.";
    }

    if (!answers.email.trim()) {
      errors.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (answers.password.length < 8) {
      errors.password = "Use at least 8 characters.";
    }

    if (!answers.passwordConfirmation) {
      errors.passwordConfirmation = "Confirm your password.";
    } else if (answers.password !== answers.passwordConfirmation) {
      errors.passwordConfirmation = "Your passwords do not match.";
    }

    if (!answers.acceptedTerms) {
      errors.acceptedTerms = "Agree to the terms to create your account.";
    }

    return errors;
  },
  "job-interests": (answers) =>
    answers.jobCategories.length > 0
      ? {}
      : { jobCategories: "Choose at least one job category." },
  "job-skills": (answers) => {
    const errors: OnboardingErrors = {};
    if (answers.desiredJobTitles.length === 0) {
      errors.desiredJobTitles = "Add at least one desired job title.";
    }
    if (answers.skills.length === 0) errors.skills = "Add at least one skill.";
    if (!answers.experienceLevel) {
      errors.experienceLevel = "Select your experience level.";
    }
    return errors;
  },
  "job-preferences": (answers) => {
    const errors: OnboardingErrors = {};
    if (answers.employmentTypes.length === 0) {
      errors.employmentTypes = "Select at least one employment type.";
    }
    if (!answers.workSetup) errors.workSetup = "Select a work setup.";
    if (answers.preferredLocations.length === 0) {
      errors.preferredLocations = "Add at least one preferred location.";
    }
    if (
      answers.minimumSalary &&
      answers.maximumSalary &&
      Number(answers.minimumSalary) > Number(answers.maximumSalary)
    ) {
      errors.maximumSalary = "Maximum salary must be at least the minimum.";
    }
    for (const [field, value] of [
      ["minimumSalary", answers.minimumSalary],
      ["maximumSalary", answers.maximumSalary],
    ] as const) {
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        errors[field] = "Enter a valid salary amount.";
      }
    }
    return errors;
  },
  school: (answers) => {
    const errors: OnboardingErrors = {};
    if (!answers.school.trim()) errors.school = "Enter your school name.";
    if (!answers.course.trim()) errors.course = "Enter your course or program.";
    if (!answers.yearLevel) errors.yearLevel = "Select your year level.";
    if (!answers.requiredOjtHours) {
      errors.requiredOjtHours = "Enter your required OJT hours.";
    } else if (
      !Number.isFinite(Number(answers.requiredOjtHours)) ||
      Number(answers.requiredOjtHours) <= 0
    ) {
      errors.requiredOjtHours = "Enter a valid number of OJT hours.";
    }
    return errors;
  },
  interests: (answers) => {
    const errors: OnboardingErrors = {};
    if (answers.trainingFields.length === 0) {
      errors.trainingFields = "Choose at least one training field.";
    } else if (answers.trainingFields.length > 3) {
      errors.trainingFields = "Choose up to 3 training fields.";
    }
    if (answers.skills.length === 0) {
      errors.skills = "Add at least one skill.";
    }
    return errors;
  },
  preferences: (answers) => {
    const errors: OnboardingErrors = {};
    if (!answers.preferredStartDate) {
      errors.preferredStartDate = "Select a preferred start date.";
    }
    if (!answers.allowancePreference) {
      errors.allowancePreference = "Select an allowance preference.";
    }
    if (!answers.workSetup) errors.workSetup = "Select a work setup.";
    if (answers.preferredLocations.length === 0) {
      errors.preferredLocations = "Add at least one preferred location.";
    }
    return errors;
  },
  resume: () => ({}),
  review: () => ({}),
};

export function validateOnboardingStep(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
) {
  return onboardingSchemas[stepId](answers);
}
