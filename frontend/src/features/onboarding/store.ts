import type { OnboardingErrors } from "@/features/onboarding/schemas";
import type { OnboardingStepId } from "@/features/onboarding/config/steps";

export type OnboardingAnswers = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedTerms: boolean;
  role: "applicant" | "employer" | "";
  goal: "job-seeker" | "ojt-seeker" | "";
  school: string;
  course: string;
  yearLevel: string;
  requiredOjtHours: string;
  requiresMoa: boolean;
  trainingFields: string[];
  jobCategories: string[];
  desiredJobTitles: string[];
  experienceLevel: string;
  employmentTypes: string[];
  minimumSalary: string;
  maximumSalary: string;
  skills: string[];
  preferredStartDate: string;
  allowancePreference: string;
  workSetup: string;
  preferredLocations: string[];
  resumeFile: File | null;
  resumeSkipped: boolean;
};

export type OnboardingState = {
  answers: OnboardingAnswers;
  currentStep: OnboardingStepId;
  errors: OnboardingErrors;
  isSubmitting: boolean;
  isComplete: boolean;
  accountCreated: boolean;
  completionMessage: string | null;
  submitError: string | null;
};

const initialState: OnboardingState = {
  answers: {
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    acceptedTerms: false,
    role: "applicant",
    goal: "ojt-seeker",
    school: "",
    course: "",
    yearLevel: "",
    requiredOjtHours: "",
    requiresMoa: true,
    trainingFields: [],
    jobCategories: [],
    desiredJobTitles: [],
    experienceLevel: "",
    employmentTypes: [],
    minimumSalary: "",
    maximumSalary: "",
    skills: [],
    preferredStartDate: "",
    allowancePreference: "",
    workSetup: "",
    preferredLocations: [],
    resumeFile: null,
    resumeSkipped: false,
  },
  currentStep: "goal",
  errors: {},
  isSubmitting: false,
  isComplete: false,
  accountCreated: false,
  completionMessage: null,
  submitError: null,
};

let state = initialState;
const listeners = new Set<() => void>();

function publish(nextState: OnboardingState) {
  state = nextState;
  listeners.forEach((listener) => listener());
}

export const onboardingStore = {
  getSnapshot: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setAnswer<Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) {
    const errors = { ...state.errors };
    delete errors[field];
    publish({
      ...state,
      currentStep: field === "goal" ? "goal" : state.currentStep,
      answers: { ...state.answers, [field]: value },
      errors,
      submitError: null,
    });
  },

  toggleListAnswer(
    field:
      | "trainingFields"
      | "jobCategories"
      | "desiredJobTitles"
      | "employmentTypes"
      | "skills"
      | "preferredLocations",
    value: string,
  ) {
    const values = state.answers[field];
    const limit =
      field === "trainingFields"
        ? 3
        : field === "jobCategories"
          ? 5
          : field === "desiredJobTitles"
            ? 3
            : undefined;
    if (
      limit !== undefined &&
      values.length >= limit &&
      !values.includes(value)
    ) {
      return;
    }
    const nextValues = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    const errors = { ...state.errors };
    delete errors[field];
    publish({
      ...state,
      answers: { ...state.answers, [field]: nextValues },
      errors,
      submitError: null,
    });
  },

  setStep(currentStep: OnboardingStepId) {
    publish({
      ...state,
      currentStep,
      isComplete: false,
      errors: {},
      submitError: null,
    });
  },

  setErrors(errors: OnboardingErrors) {
    publish({ ...state, errors });
  },

  setSubmitting(isSubmitting: boolean) {
    publish({ ...state, isSubmitting });
  },

  markAccountCreated() {
    publish({
      ...state,
      answers: {
        ...state.answers,
        password: "",
        passwordConfirmation: "",
      },
      accountCreated: true,
      isSubmitting: false,
      submitError: null,
    });
  },

  setSubmitError(submitError: string | null) {
    publish({ ...state, isSubmitting: false, submitError });
  },

  complete(completionMessage: string) {
    publish({
      ...state,
      answers: {
        ...state.answers,
        password: "",
        passwordConfirmation: "",
      },
      isSubmitting: false,
      isComplete: true,
      completionMessage,
      submitError: null,
    });
  },

  reset() {
    publish(initialState);
  },
};
