import type {
  EmployerProfile,
  EmployerRegistrationInput,
  EmployerStatus,
} from "@/features/employer-registration/types";
import { authApi } from "@/features/auth/api";
import { hasRequiredEmployerVerificationDocuments } from "@/features/employer-verification/api";

const storageKey = "careerconnect.employer-registration";
const listeners = new Set<() => void>();

function isEmployerProfile(value: unknown): value is EmployerProfile {
  if (!value || typeof value !== "object") return false;
  const employer = value as Partial<EmployerProfile>;
  return (
    typeof employer.id === "string" &&
    typeof employer.workEmail === "string" &&
    typeof employer.companyName === "string" &&
    [
      "email_unverified",
      "docs_required",
      "pending_review",
      "rejected",
      "approved",
    ].includes(employer.status ?? "")
  );
}

function readEmployer(): EmployerProfile | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isEmployerProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

let employerSnapshot = readEmployer();

function publish(employer: EmployerProfile | null) {
  employerSnapshot = employer;
  try {
    if (employer) localStorage.setItem(storageKey, JSON.stringify(employer));
    else localStorage.removeItem(storageKey);
  } catch {
    // State remains available in memory for this browser session.
  }
  listeners.forEach((listener) => listener());
}

function simulateDelay() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 300));
}

export function getEmployerStatusPath(status: EmployerStatus | null | undefined) {
  switch (status) {
    case "email_unverified":
      return "/employer/verify-email";
    case "docs_required":
    case "rejected":
      return "/employer/verification";
    case "pending_review":
      return "/employer/under-review";
    case "approved":
      return "/employer/overview";
    default:
      return "/employer/register";
  }
}

export const employerRegistrationApi = {
  getSnapshot: () => employerSnapshot,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async register(input: EmployerRegistrationInput) {
    const registration = await authApi.register({
      name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
      email: input.workEmail.trim(),
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      role: "employer",
    });

    if (registration.resume_verification) {
      const existingEmployer: EmployerProfile = {
        id: employerSnapshot?.id ?? `employer-${Date.now()}`,
        firstName: input.firstName,
        lastName: input.lastName,
        workEmail: input.workEmail.trim(),
        companyName: employerSnapshot?.companyName ?? input.companyName.trim(),
        website: employerSnapshot?.website ?? input.website.trim(),
        companySize: employerSnapshot?.companySize ?? input.companySize,
        industry: employerSnapshot?.industry ?? input.industry,
        companyRole: employerSnapshot?.companyRole ?? input.companyRole.trim(),
        status: "email_unverified",
      };
      publish(existingEmployer);
      return existingEmployer;
    }

    const employer: EmployerProfile = {
      id: globalThis.crypto?.randomUUID?.() ?? `employer-${Date.now()}`,
      firstName: input.firstName,
      lastName: input.lastName,
      workEmail: input.workEmail.trim(),
      companyName: input.companyName.trim(),
      website: input.website.trim(),
      companySize: input.companySize,
      industry: input.industry,
      companyRole: input.companyRole.trim(),
      status: "email_unverified",
    };

    publish(employer);
    return employer;
  },

  async requestEmailVerificationCode() {
    if (!employerSnapshot || employerSnapshot.status !== "email_unverified") {
      throw new Error("There is no employer account awaiting email verification.");
    }
    return authApi.requestEmailVerificationCode(employerSnapshot.workEmail);
  },

  async setStatus(status: EmployerStatus, rejectionReason?: string) {
    await simulateDelay();
    if (!employerSnapshot) throw new Error("No employer registration exists.");
    if (
      (status === "pending_review" || status === "approved") &&
      !hasRequiredEmployerVerificationDocuments(employerSnapshot.id)
    ) {
      throw new Error("All required company and employer ID documents must be submitted first.");
    }

    const employer: EmployerProfile = {
      ...employerSnapshot,
      status,
      ...(status === "rejected" ? { rejectionReason } : { rejectionReason: undefined }),
    };
    publish(employer);
    return employer;
  },


  clear() {
    publish(null);
  },
};