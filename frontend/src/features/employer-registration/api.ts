import type {
  EmployerProfile,
  EmployerRegistrationInput,
  EmployerStatus,
} from "@/features/employer-registration/types";

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
    // Keep mock state in memory when browser storage is unavailable.
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
    await simulateDelay();
    if (
      employerSnapshot?.workEmail.toLocaleLowerCase() ===
      input.workEmail.toLocaleLowerCase()
    ) {
      throw new Error("An employer registration already exists for this email.");
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
    await simulateDelay();
    if (!employerSnapshot || employerSnapshot.status !== "email_unverified") {
      throw new Error("There is no employer account awaiting email verification.");
    }

    // TODO: Send a real one-time code to the employer work email.
    return { message: "Development verification code: 123456" };
  },

  async verifyEmailCode(code: string) {
    await simulateDelay();
    if (!employerSnapshot || employerSnapshot.status !== "email_unverified") {
      throw new Error("There is no employer account awaiting email verification.");
    }
    if (code !== "123456") {
      throw new Error("The verification code is incorrect or expired.");
    }

    const employer: EmployerProfile = {
      ...employerSnapshot,
      status: "docs_required",
    };
    publish(employer);
    return employer;
  },

  async setStatus(status: EmployerStatus, rejectionReason?: string) {
    await simulateDelay();
    if (!employerSnapshot) throw new Error("No employer registration exists.");

    const employer: EmployerProfile = {
      ...employerSnapshot,
      status,
      ...(status === "rejected" ? { rejectionReason } : { rejectionReason: undefined }),
    };
    publish(employer);
    return employer;
  },

  setStatusForDevelopment(status: EmployerStatus, rejectionReason?: string) {
    if (!import.meta.env.DEV) {
      throw new Error("Employer status controls are available only in development.");
    }
    if (!employerSnapshot) throw new Error("No employer registration exists.");

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