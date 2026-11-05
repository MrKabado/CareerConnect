import { getCompanyProfile } from "@/features/companies/companyProfiles";
import {
  employerRegistrationApi,
} from "@/features/employer-registration/api";
import {
  getEmployerVerificationDocuments,
  hasRequiredEmployerVerificationDocuments,
  subscribeEmployerVerificationDocuments,
} from "@/features/employer-verification/api";
import { computeProfileStrength } from "@/features/company-profile/strength";
import type {
  CompanyMediaCollection,
} from "@/features/company-profile/types";
import { subscribeCompanyProfiles } from "@/features/companies/companyProfiles";
import {
  buildCompanyVerificationStages,
} from "@/features/company-verification/stages";
import type {
  CompanyEntityType,
  CompanyVerificationAction,
  CompanyVerificationInformation,
  CompanyVerificationRecord,
  CompanyVerificationRiskFlag,
  CompanyVerificationSnapshot,
  CompanyVerificationStageId,
  CompanyVerificationStageStatus,
} from "@/features/company-verification/types";

const STORAGE_KEY = "careerconnect.company-verification.v1";
// TODO(backend): Move verification progress and document metadata to durable, access-controlled storage.
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const freeEmailDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);
const listeners = new Set<() => void>();
const emptyMedia: CompanyMediaCollection = {
  logo: null,
  banner: null,
  gallery: [],
  videoUrl: "",
  coverImageId: null,
};
const mayaDemoMedia: CompanyMediaCollection = {
  logo: {
    id: "maya-demo-logo",
    url: "/maya-logo.svg",
    altText: "Maya logo",
  },
  banner: null,
  gallery: [
    {
      id: "maya-demo-office-1",
      url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=960&q=80",
      altText: "Bright collaborative office workspace",
    },
    {
      id: "maya-demo-office-2",
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=960&q=80",
      altText: "Modern team meeting space",
    },
    {
      id: "maya-demo-office-3",
      url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=960&q=80",
      altText: "Open office with shared work tables",
    },
  ],
  videoUrl: "",
  coverImageId: "maya-demo-office-1",
};
const mayaDemoRecord: CompanyVerificationRecord = {
  hiringDefaultsComplete: true,
  media: mayaDemoMedia,
};

type CompanyVerificationStore = Record<string, CompanyVerificationRecord>;

const entityTypes: readonly CompanyEntityType[] = [
  "sole_proprietor",
  "company",
  "agency_recruiter",
  "public_or_nonprofit",
];

function isCompanyVerificationInformation(
  value: unknown,
): value is CompanyVerificationInformation {
  if (!value || typeof value !== "object") return false;
  const information = value as Partial<CompanyVerificationInformation>;
  return (
    typeof information.legalName === "string" &&
    typeof information.country === "string" &&
    entityTypes.includes(information.entityType as CompanyEntityType) &&
    typeof information.registrationNumber === "string" &&
    typeof information.website === "string" &&
    typeof information.industry === "string" &&
    typeof information.teamSize === "string" &&
    typeof information.userRole === "string" &&
    typeof information.overview === "string"
  );
}

function isCompanyVerificationRecord(value: unknown): value is CompanyVerificationRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CompanyVerificationRecord>;
  return (
    (record.emailCodeRequested === undefined || typeof record.emailCodeRequested === "boolean") &&
    (record.emailVerifiedAt === undefined || typeof record.emailVerifiedAt === "string") &&
    (record.companyInformation === undefined || isCompanyVerificationInformation(record.companyInformation)) &&
    (record.registryMismatch === undefined || typeof record.registryMismatch === "boolean") &&
    (record.legalDocumentsStarted === undefined || typeof record.legalDocumentsStarted === "boolean") &&
    (record.legalDocumentsSubmitted === undefined || typeof record.legalDocumentsSubmitted === "boolean") &&
    (record.reviewStatus === undefined || ["not_submitted", "submitted", "needs_changes", "approved"].includes(record.reviewStatus)) &&
    (record.reviewReason === undefined || typeof record.reviewReason === "string") &&
    (record.hiringDefaultsComplete === undefined || typeof record.hiringDefaultsComplete === "boolean") &&
    (record.media === undefined || isCompanyMediaCollection(record.media))
  );
}

function isCompanyMediaCollection(value: unknown): value is CompanyMediaCollection {
  if (!value || typeof value !== "object") return false;
  const media = value as Partial<CompanyMediaCollection>;
  const isAsset = (asset: unknown) => {
    if (asset === null) return true;
    if (!asset || typeof asset !== "object") return false;
    const candidate = asset as { id?: unknown; url?: unknown; altText?: unknown; status?: unknown; rejectionReason?: unknown };
    return (
      typeof candidate.id === "string" &&
      typeof candidate.url === "string" &&
      typeof candidate.altText === "string" &&
      (candidate.status === undefined || ["pending_review", "approved", "rejected"].includes(String(candidate.status)))
    );
  };
  return (
    (media.logo === null || isAsset(media.logo)) &&
    (media.banner === null || media.banner === undefined || isAsset(media.banner)) &&
    Array.isArray(media.gallery) && media.gallery.every(isAsset) &&
    typeof media.videoUrl === "string" &&
    (media.coverImageId === null || typeof media.coverImageId === "string")
  );
}

function readStore(): CompanyVerificationStore {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return {};
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const store: CompanyVerificationStore = {};
    for (const [employerId, value] of Object.entries(parsed)) {
      if (isCompanyVerificationRecord(value)) store[employerId] = value;
    }
    return store;
  } catch {
    return {};
  }
}

let store = readStore();

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 300));
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLocaleLowerCase().replace(/^www\./, "");
}

function getWebsiteDomain(website: string): string | null {
  try {
    const url = new URL(website.match(/^https?:\/\//i) ? website : `https://${website}`);
    return normalizeDomain(url.hostname);
  } catch {
    return null;
  }
}

export function getCompanyVerificationRiskFlags(
  workEmail: string,
  website: string,
  entityType?: CompanyEntityType,
  registryMismatch = false,
): CompanyVerificationRiskFlag[] {
  const flags: CompanyVerificationRiskFlag[] = [];
  const emailDomain = normalizeDomain(workEmail.split("@").at(-1) ?? "");
  const websiteDomain = getWebsiteDomain(website);

  if (freeEmailDomains.has(emailDomain)) {
    flags.push({
      id: "free_email_domain",
      reason: `A company-domain email is required; ${emailDomain} is a free email domain.`,
    });
  }
  if (emailDomain && websiteDomain && emailDomain !== websiteDomain) {
    flags.push({
      id: "domain_mismatch",
      reason: `The work email domain (${emailDomain}) does not match the website domain (${websiteDomain}).`,
    });
  }
  if (registryMismatch) {
    flags.push({
      id: "registry_mismatch",
      reason: "The company registration details did not match the mock registry lookup.",
    });
  }
  if (entityType === "agency_recruiter") {
    flags.push({
      id: "recruitment_license",
      reason: "Recruitment agencies must provide a valid recruitment license.",
    });
  }
  return flags;
}

export function validateCompanyVerificationFile(file: File): string | null {
  if (!allowedMimeTypes.has(file.type)) return "Choose a PDF, JPG, or PNG file.";
  if (file.size > MAX_FILE_SIZE) return "Each document must be 10 MB or smaller.";
  if (file.size === 0) return "The selected file is empty. Choose another document.";
  return null;
}

export function isCompanyVerificationInformationComplete(
  information: CompanyVerificationInformation | undefined,
): boolean {
  if (!information) return false;

  const isValidWebsite = (() => {
    try {
      const website = new URL(
        information.website.match(/^https?:\/\//i)
          ? information.website
          : `https://${information.website}`,
      );
      return website.protocol === "http:" || website.protocol === "https:";
    } catch {
      return false;
    }
  })();

  return (
    information.legalName.trim().length > 0 &&
    information.country.trim().length > 0 &&
    entityTypes.includes(information.entityType) &&
    information.registrationNumber.trim().length > 0 &&
    isValidWebsite &&
    information.industry.trim().length > 0 &&
    information.teamSize.trim().length > 0 &&
    information.userRole.trim().length > 0 &&
    information.overview.trim().length >= 100
  );
}

function getReviewStatus(
  record: CompanyVerificationRecord,
  employerStatus: string | undefined,
): CompanyVerificationRecord["reviewStatus"] {
  if (record.reviewStatus) return record.reviewStatus;
  if (employerStatus === "approved") return "approved";
  if (employerStatus === "pending_review") return "submitted";
  if (employerStatus === "rejected") return "needs_changes";
  return "not_submitted";
}

function getSnapshot(): CompanyVerificationSnapshot {
  const employer = employerRegistrationApi.getSnapshot();
  const record = employer
    ? {
        ...(employer.id === "maya-philippines-demo" ? mayaDemoRecord : {}),
        ...(store[employer.id] ?? {}),
      }
    : {};
  const reviewStatus = getReviewStatus(record, employer?.status);
  const isLegacyApproved = employer?.status === "approved" &&
    record.reviewStatus !== "needs_changes";
  const isLegacySubmitted = employer?.status === "pending_review" &&
    record.reviewStatus === undefined;
  const hasSubmittedDocuments = record.legalDocumentsSubmitted === true ||
    isLegacyApproved ||
    isLegacySubmitted ||
    (employer !== null && hasRequiredEmployerVerificationDocuments(employer.id));
  const profile = employer ? getCompanyProfile(employer.companyName) : undefined;
  const media = record.media ?? emptyMedia;
  const profileStrength = profile ? computeProfileStrength(profile, media) : null;
  const strengthItemComplete = (id: string) =>
    profileStrength?.items.find((item) => item.id === id)?.complete === true;
  const hiringSetupComplete = record.hiringDefaultsComplete === true &&
    strengthItemComplete("hiring_locations") &&
    strengthItemComplete("benefits_and_culture") &&
    strengthItemComplete("company_values");
  const mediaComplete = strengthItemComplete("company_media");
  const emailVerified = record.emailVerifiedAt !== undefined ||
    (employer !== null && employer.status !== "email_unverified");
  const informationComplete = isCompanyVerificationInformationComplete(
    record.companyInformation,
  );
  const isInformationComplete = informationComplete || isLegacyApproved || isLegacySubmitted;
  const isDocumentsComplete = hasSubmittedDocuments;

  const rawStatuses: Record<CompanyVerificationStageId, CompanyVerificationStageStatus> = {
    email_verification: emailVerified
      ? "complete"
      : record.emailCodeRequested
        ? "in_progress"
        : "not_started",
    company_information: isInformationComplete
      ? "complete"
      : record.companyInformation
        ? "in_progress"
        : "not_started",
    legal_documents: isDocumentsComplete
      ? "complete"
      : record.legalDocumentsStarted
        ? "in_progress"
        : "not_started",
    verification_review:
      reviewStatus === "approved"
        ? "complete"
        : reviewStatus === "submitted"
          ? "submitted"
          : reviewStatus === "needs_changes"
            ? "needs_changes"
            : "not_started",
    hiring_setup: hiringSetupComplete
      ? "complete"
      : profile
        ? "in_progress"
        : "not_started",
    company_media: mediaComplete
      ? "complete"
      : media.logo || media.gallery.length > 0
        ? "in_progress"
        : "not_started",
  };

  if (isLegacyApproved) {
    rawStatuses.email_verification = "complete";
    rawStatuses.company_information = "complete";
    rawStatuses.legal_documents = "complete";
    rawStatuses.verification_review = "complete";
  }
  if (isLegacySubmitted) {
    rawStatuses.email_verification = "complete";
    rawStatuses.company_information = "complete";
    rawStatuses.legal_documents = "complete";
  }

  const unlockedStatuses = { ...rawStatuses };
  const requiredIds: CompanyVerificationStageId[] = [
    "email_verification",
    "company_information",
    "legal_documents",
    "verification_review",
  ];
  for (let index = 1; index < requiredIds.length; index += 1) {
    const previousStatus = unlockedStatuses[requiredIds[index - 1]];
    if (previousStatus !== "complete") {
      unlockedStatuses[requiredIds[index]] = "locked";
    }
  }
  if (unlockedStatuses.verification_review !== "complete") {
    unlockedStatuses.hiring_setup = "locked";
    unlockedStatuses.company_media = "locked";
  } else if (unlockedStatuses.hiring_setup !== "complete") {
    unlockedStatuses.company_media = "locked";
  }

  const reasons = reviewStatus === "needs_changes" && record.reviewReason
    ? { verification_review: record.reviewReason }
    : {};
  const stages = buildCompanyVerificationStages(unlockedStatuses, reasons);
  const percent = stages.reduce(
    (total, stage) => total + (stage.status === "complete" ? stage.weight : 0),
    0,
  );
  const firstIncompleteRequiredStage = stages
    .slice(0, 4)
    .find((stage) => stage.status !== "complete") ?? null;
  const currentStage = stages.find((stage) =>
    stage.status !== "complete" && stage.status !== "locked",
  ) ?? null;
  const nextStage = currentStage ?? stages.find((stage) => stage.status === "locked") ?? stages[5];
  const nextAction: CompanyVerificationAction = percent === 100
    ? {
        stageId: "company_media",
        label: "Manage profile",
        route: "/employer/company-profile",
      }
    : {
        stageId: nextStage.id,
        label: nextActionLabel(nextStage.id, nextStage.status),
        route: nextStage.route,
      };
  const riskFlags = employer
    ? getCompanyVerificationRiskFlags(
        employer.workEmail,
        record.companyInformation?.website ?? employer.website,
        record.companyInformation?.entityType,
        record.registryMismatch,
      )
    : [];

  return {
    employerId: employer?.id ?? null,
    record,
    stages,
    percent,
    nextAction,
    currentStage,
    firstIncompleteRequiredStage,
    riskFlags,
    dashboardReady: requiredIds.every((id) => unlockedStatuses[id] === "complete"),
  };
}

function nextActionLabel(
  stageId: CompanyVerificationStageId,
  status: CompanyVerificationStageStatus,
): string {
  if (status === "needs_changes") return "Fix and resubmit";
  switch (stageId) {
    case "email_verification":
      return "Continue: Email verification";
    case "company_information":
      return "Continue: Company information";
    case "legal_documents":
      return "Continue: Legal documents";
    case "verification_review":
      return status === "submitted" ? "View review status" : "Continue: Verification review";
    case "hiring_setup":
      return "Continue: Hiring setup";
    case "company_media":
      return "Add company media";
  }
}

let snapshot = getSnapshot();

function notify(): void {
  snapshot = getSnapshot();
  listeners.forEach((listener) => listener());
}

function requireEmployerId(): string {
  const employer = employerRegistrationApi.getSnapshot();
  if (!employer) throw new Error("Register an employer account first.");
  return employer.id;
}

function updateRecord(
  update: (record: CompanyVerificationRecord) => CompanyVerificationRecord,
): void {
  const employerId = requireEmployerId();
  store = { ...store, [employerId]: update(store[employerId] ?? {}) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Keep mock verification state in memory when browser storage is unavailable.
  }
  notify();
}

export const companyVerificationApi = {
  getSnapshot: () => snapshot,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async requestWorkEmailCode() {
    const result = await employerRegistrationApi.requestEmailVerificationCode();
    updateRecord((record) => ({ ...record, emailCodeRequested: true }));
    // TODO(backend): Deliver the verification code to the employer work email.
    return result;
  },

  async verifyWorkEmail(code: string) {
    const employer = await employerRegistrationApi.verifyEmailCode(code);
    updateRecord((record) => ({
      ...record,
      emailVerifiedAt: new Date().toISOString(),
    }));
    return employer;
  },

  saveCompanyInformation(information: CompanyVerificationInformation) {
    updateRecord((record) => ({ ...record, companyInformation: information }));
    // TODO(backend): Check company registration details against the official registry.
  },

  setRegistryMismatchForDevelopment(mismatch: boolean) {
    if (!import.meta.env.DEV) {
      throw new Error("Registry simulation is available only in development.");
    }
    updateRecord((record) => ({ ...record, registryMismatch: mismatch }));
  },

  markLegalDocumentsStarted() {
    updateRecord((record) => ({ ...record, legalDocumentsStarted: true }));
  },

  async markLegalDocumentsSubmitted() {
    await simulateDelay();
    const employerId = requireEmployerId();
    const documents = getEmployerVerificationDocuments(employerId);
    const requiredKinds = ["business_registration", "employer_id_primary"] as const;
    if (!requiredKinds.every((kind) => documents.some((document) => document.kind === kind))) {
      throw new Error("Upload proof of business existence and a government ID before submitting.");
    }
    updateRecord((record) => ({
      ...record,
      legalDocumentsStarted: true,
      legalDocumentsSubmitted: true,
    }));
  },

  async submitForReview() {
    await simulateDelay();
    const record = snapshot.record;
    if (!isCompanyVerificationInformationComplete(record.companyInformation)) {
      throw new Error("Complete all required company information before submitting for review.");
    }
    if (!record.legalDocumentsSubmitted) {
      throw new Error("Submit the required legal documents before requesting review.");
    }
    updateRecord((current) => ({
      ...current,
      reviewStatus: "submitted",
      reviewReason: undefined,
    }));
  },

  setReviewStatusForDevelopment(
    status: "approved" | "needs_changes",
    reason?: string,
  ) {
    if (!import.meta.env.DEV) {
      throw new Error("Review controls are available only in development.");
    }
    updateRecord((record) => ({
      ...record,
      reviewStatus: status,
      ...(status === "needs_changes"
        ? { reviewReason: reason?.trim() || "Please review the requested company information and documents." }
        : { reviewReason: undefined }),
    }));
    // TODO(backend): Restrict review decisions to authorized moderators and record an audit trail.
  },

  setHiringDefaultsComplete(complete: boolean) {
    updateRecord((record) => ({ ...record, hiringDefaultsComplete: complete }));
  },

  setCompanyMedia(media: CompanyMediaCollection) {
    updateRecord((record) => ({ ...record, media }));
    // TODO(backend): Store media privately and expose it only after moderation and authorization.
  },

  validateFile: validateCompanyVerificationFile,

  resetForDevelopment() {
    if (!import.meta.env.DEV) {
      throw new Error("Verification reset is available only in development.");
    }
    const employerId = requireEmployerId();
    const nextStore = { ...store };
    delete nextStore[employerId];
    store = nextStore;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Keep mock verification state in memory when browser storage is unavailable.
    }
    notify();
  },
};

employerRegistrationApi.subscribe(notify);
subscribeEmployerVerificationDocuments(notify);
subscribeCompanyProfiles(notify);
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  store = readStore();
  notify();
});

// TODO(backend): Verify employer ownership and authorization on every read and write.