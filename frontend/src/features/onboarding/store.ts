import type { OnboardingErrors } from "@/features/onboarding/schemas";
import {
  getOnboardingSteps,
  type OnboardingStepId,
} from "@/features/onboarding/config/steps";

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
  resumeUploadedFileName: string | null;
  coverLetterFile: File | null;
  resumeSkipped: boolean;
};

export type OnboardingState = {
  answers: OnboardingAnswers;
  currentStep: OnboardingStepId;
  errors: OnboardingErrors;
  isSubmitting: boolean;
  isComplete: boolean;
  accountCreated: boolean;
  onboardingToken: string | null;
  uploadProgress: number | null;
  resumeUploadFingerprint: string | null;
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
    resumeUploadedFileName: null,
    coverLetterFile: null,
    resumeSkipped: false,
  },
  currentStep: "goal",
  errors: {},
  isSubmitting: false,
  isComplete: false,
  accountCreated: false,
  onboardingToken: null,
  uploadProgress: null,
  resumeUploadFingerprint: null,
  completionMessage: null,
  submitError: null,
};

const draftStorageKey = "careerconnect-onboarding-draft";
const onboardingTokenStorageKey = "careerconnect-onboarding-resume-token";
const stepIds = new Set<string>([
  "goal",
  "create-account",
  "job-interests",
  "job-skills",
  "job-preferences",
  "school",
  "interests",
  "preferences",
  "resume",
  "review",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOnboardingAnswers(
  value: Record<string, unknown>,
): value is OnboardingAnswers {
  const stringFields = [
    "name",
    "email",
    "password",
    "passwordConfirmation",
    "school",
    "course",
    "yearLevel",
    "requiredOjtHours",
    "experienceLevel",
    "minimumSalary",
    "maximumSalary",
    "preferredStartDate",
    "allowancePreference",
    "workSetup",
  ];
  const arrayFields = [
    "trainingFields",
    "jobCategories",
    "desiredJobTitles",
    "employmentTypes",
    "skills",
    "preferredLocations",
  ];

  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    arrayFields.every((field) => isStringArray(value[field])) &&
    typeof value.acceptedTerms === "boolean" &&
    typeof value.requiresMoa === "boolean" &&
    typeof value.resumeSkipped === "boolean" &&
    (value.resumeUploadedFileName === null ||
      typeof value.resumeUploadedFileName === "string") &&
    value.resumeFile === null &&
    value.coverLetterFile === null &&
    (value.role === "applicant" || value.role === "employer") &&
    (value.goal === "job-seeker" || value.goal === "ojt-seeker")
  );
}

function readSavedDraft(): OnboardingState {
  let saved: string | null;
  try {
    saved = localStorage.getItem(draftStorageKey);
  } catch {
    return {
      ...initialState,
      submitError:
        "We couldn’t access saved progress in this browser. Check your browser storage settings and try again.",
    };
  }
  if (!saved) return initialState;

  let draft: unknown;
  try {
    draft = JSON.parse(saved);
  } catch {
    return {
      ...initialState,
      submitError:
        "We couldn’t read your saved progress in this browser. You can start again or continue from the beginning.",
    };
  }

  if (!isRecord(draft) || !isRecord(draft.answers)) {
    return {
      ...initialState,
      submitError:
        "Your saved progress has an invalid format. You can start again or continue from the beginning.",
    };
  }

  const draftAnswers = {
    ...draft.answers,
    resumeUploadedFileName:
      typeof draft.answers.resumeUploadedFileName === "string"
        ? draft.answers.resumeUploadedFileName
        : null,
  };

  if (
    !isOnboardingAnswers(draftAnswers) ||
    (draft.version !== 1 && draft.version !== 2) ||
    draft.accountCreated !== true ||
    typeof draft.currentStep !== "string" ||
    !stepIds.has(draft.currentStep) ||
    !getOnboardingSteps(draftAnswers.goal).some(
      (step) => step.id === draft.currentStep,
    )
  ) {
    return {
      ...initialState,
      submitError:
        "Your saved progress has an invalid format. You can start again or continue from the beginning.",
    };
  }

  return {
    ...initialState,
    answers: {
      ...initialState.answers,
      ...draftAnswers,
      password: "",
      passwordConfirmation: "",
      resumeFile: null,
      coverLetterFile: null,
    },
    currentStep: draft.currentStep as OnboardingStepId,
    accountCreated: true,
  };
}

function readOnboardingToken(): string | null {
  try {
    return sessionStorage.getItem(onboardingTokenStorageKey);
  } catch {
    return null;
  }
}

function resumeFileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

let state = { ...readSavedDraft(), onboardingToken: readOnboardingToken() };
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
      resumeUploadFingerprint:
        field === "resumeFile" && value !== state.answers.resumeFile
          ? null
          : state.resumeUploadFingerprint,
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

  setUploadProgress(uploadProgress: number | null) {
    publish({ ...state, uploadProgress });
  },

  setOnboardingToken(onboardingToken: string) {
    let submitError: string | null = null;
    try {
      sessionStorage.setItem(onboardingTokenStorageKey, onboardingToken);
    } catch {
      submitError =
        "Your resume upload session could not be saved. Keep this tab open until setup is complete.";
    }
    publish({ ...state, onboardingToken, submitError });
  },

  clearOnboardingToken() {
    try {
      sessionStorage.removeItem(onboardingTokenStorageKey);
    } catch {
      publish({
        ...state,
        onboardingToken: null,
        submitError:
          "The temporary resume upload session could not be cleared from this browser.",
      });
      return;
    }
    publish({ ...state, onboardingToken: null });
  },

  isResumeUploaded(file: File | null) {
    return file !== null && state.resumeUploadFingerprint === resumeFileFingerprint(file);
  },

  markResumeUploaded(fileName: string) {
    publish({
      ...state,
      answers: {
        ...state.answers,
        resumeUploadedFileName: fileName,
        resumeSkipped: false,
      },
      resumeUploadFingerprint: state.answers.resumeFile
        ? resumeFileFingerprint(state.answers.resumeFile)
        : null,
      uploadProgress: null,
      isSubmitting: false,
      submitError: null,
    });
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

  saveDraft() {
    const draft = JSON.stringify({
      version: 2,
      answers: {
        ...state.answers,
        password: "",
        passwordConfirmation: "",
        resumeFile: null,
        coverLetterFile: null,
      },
      currentStep: state.currentStep,
      accountCreated: state.accountCreated,
    });

    try {
      localStorage.setItem(draftStorageKey, draft);
    } catch {
      publish({
        ...state,
        submitError:
          "We couldn’t save your progress in this browser. Check your browser storage settings and try again.",
      });
      return false;
    }

    publish({ ...state, submitError: null });
    return true;
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
    try {
      sessionStorage.removeItem(onboardingTokenStorageKey);
    } catch {
      publish({
        ...initialState,
        submitError:
          "The temporary resume upload session could not be cleared from this browser.",
      });
      return;
    }
    publish(initialState);
  },
};
