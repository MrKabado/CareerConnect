import type {
  CompanyVerificationStage,
  CompanyVerificationStageId,
  CompanyVerificationStageStatus,
} from "@/features/company-verification/types";

export type VerificationStageInput = {
  name?: string;
  overview?: string;
  industry?: string;
  teamSize?: string;
  website?: string;
  location?: string;
  country?: string;
  entityType?: string;
  registrationNumber?: string;
  userRole?: string;
  legalName?: string;
  hiringDefaults?: {
    title?: string;
    department?: string;
    location?: string;
    workspace?: string;
    schoolPartnerships?: string;
    acceptedCourses?: string;
  } | null;
  logoUrl?: string;
  cultureSummary?: string;
  benefits?: string[];
  locations?: Array<{ city?: string; label?: string }>;
  lifeAt?: Array<{ title?: string; description?: string }>;
  media?: {
    logo?: { status?: string } | null;
    gallery?: Array<{ status?: string }>;
  } | null;
  workEmail?: string;
  status?: string;
};

export const RE_REVIEW_FIELDS = [
  "legalName",
  "country",
  "entityType",
  "registrationNumber",
] as const;

export const DOMAIN_MATCH_FIELDS = ["website", "workEmail"] as const;

export const companyVerificationStageDefinitions = [
  {
    id: "email_verification",
    label: "Email verification",
    description: "Verify the work email used to register your company.",
    weight: 10,
    status: "not_started",
    hint: "Verify your work email to continue.",
    route: "/employer/verify-email",
  },
  {
    id: "company_information",
    label: "Company information",
    description: "Provide your legal registration and company details.",
    weight: 15,
    status: "not_started",
    hint: "Complete all required legal and company information.",
    route: "/employer/verification/company-info",
  },
  {
    id: "legal_documents",
    label: "Legal documents",
    description: "Submit proof of business existence and a government ID.",
    weight: 25,
    status: "not_started",
    hint: "Upload proof of business existence and the registering person's government ID.",
    route: "/employer/verification",
  },
  {
    id: "verification_review",
    label: "Verification review",
    description: "Our team reviews your submitted company details and documents.",
    weight: 20,
    status: "not_started",
    hint: "Submit your details and documents to begin review.",
    route: "/employer/under-review",
  },
  {
    id: "hiring_setup",
    label: "Hiring setup",
    description: "Prepare locations, benefits, culture, values, and hiring defaults.",
    weight: 15,
    status: "not_started",
    hint: "Add hiring locations, benefits, culture, values, and hiring defaults.",
    route: "/employer/hiring-setup",
  },
  {
    id: "company_media",
    label: "Company media",
    description: "Add approved company branding and workplace photos.",
    weight: 15,
    status: "not_started",
    hint: "Add a company logo and at least 3 photos.",
    route: "/employer/company-profile",
  },
] as const satisfies readonly CompanyVerificationStage[];

export function isReReviewField(field: string): boolean {
  return RE_REVIEW_FIELDS.includes(field as (typeof RE_REVIEW_FIELDS)[number]);
}

export function isDomainMatchRecheckField(field: string): boolean {
  return DOMAIN_MATCH_FIELDS.includes(field as (typeof DOMAIN_MATCH_FIELDS)[number]);
}

function hasMeaningfulText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isCompanyInformationComplete(profile: VerificationStageInput): boolean {
  const requiredData = [
    profile.legalName,
    profile.country,
    profile.entityType,
    profile.registrationNumber,
    profile.website,
    profile.industry,
    profile.teamSize,
    profile.userRole,
    profile.overview,
  ];

  if (!requiredData.every((value) => hasMeaningfulText(value))) return false;
  if (!profile.overview || profile.overview.trim().length < 100) return false;

  try {
    const website = new URL(
      /^https?:\/\//i.test(profile.website ?? "") ? profile.website ?? "" : `https://${profile.website ?? ""}`,
    );
    if (website.protocol !== "http:" && website.protocol !== "https:") {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export function getHiringSetupRequirements(profile: VerificationStageInput) {
  const defaults = profile.hiringDefaults;

  return [
    {
      label: "Hiring locations",
      complete: Array.isArray(profile.locations) &&
        profile.locations.some((location) => hasMeaningfulText(location.city)),
    },
    {
      label: "Benefits",
      complete: Array.isArray(profile.benefits) &&
        profile.benefits.filter((benefit) => hasMeaningfulText(benefit)).length >= 3,
    },
    {
      label: "Culture summary",
      complete: hasMeaningfulText(profile.cultureSummary),
    },
    {
      label: "Company values",
      complete: Array.isArray(profile.lifeAt) &&
        profile.lifeAt.filter((value) =>
          hasMeaningfulText(value.title) && hasMeaningfulText(value.description),
        ).length >= 3,
    },
    {
      label: "Hiring defaults",
      complete: !!defaults && [
        defaults.title,
        defaults.department,
        defaults.location,
        defaults.workspace,
        defaults.schoolPartnerships,
        defaults.acceptedCourses,
      ].every((value) => hasMeaningfulText(value)),
    },
  ];
}

function isHiringSetupComplete(profile: VerificationStageInput): boolean {
  return getHiringSetupRequirements(profile).every((requirement) => requirement.complete);
}

function isUploadedMediaAsset(asset: { status?: string } | null | undefined): boolean {
  return !!asset;
}

function isCompanyMediaComplete(profile: VerificationStageInput): boolean {
  const logoUploaded = isUploadedMediaAsset(profile.media?.logo);
  const galleryUploaded = Array.isArray(profile.media?.gallery)
    ? profile.media.gallery.filter((asset) => isUploadedMediaAsset(asset)).length >= 3
    : false;

  return logoUploaded && galleryUploaded;
}

export function computeStages(
  profile: VerificationStageInput,
  employerStatus?: string,
): CompanyVerificationStage[] {
  const statuses: Record<CompanyVerificationStageId, CompanyVerificationStageStatus> = {
    email_verification: employerStatus && employerStatus !== "email_unverified" ? "complete" : "not_started",
    company_information: isCompanyInformationComplete(profile) ? "complete" : hasMeaningfulText(profile.name) || hasMeaningfulText(profile.industry) || hasMeaningfulText(profile.overview) ? "in_progress" : "not_started",
    legal_documents: employerStatus === "approved" || employerStatus === "pending_review" ? "complete" : employerStatus === "rejected" || employerStatus === "docs_required" ? "in_progress" : "not_started",
    verification_review: employerStatus === "approved" ? "complete" : employerStatus === "pending_review" ? "submitted" : employerStatus === "rejected" ? "needs_changes" : "not_started",
    hiring_setup: isHiringSetupComplete(profile) ? "complete" : hasMeaningfulText(profile.cultureSummary) || Array.isArray(profile.locations) || Array.isArray(profile.benefits) || Array.isArray(profile.lifeAt) || !!profile.hiringDefaults ? "in_progress" : "not_started",
    company_media: isCompanyMediaComplete(profile) ? "complete" : !!profile.media || !!profile.logoUrl ? "in_progress" : "not_started",
  };

  return buildCompanyVerificationStages(statuses);
}

export function assertCompanyVerificationWeights(
  definitions: readonly Pick<CompanyVerificationStage, "weight">[] =
    companyVerificationStageDefinitions,
): void {
  const total = definitions.reduce((sum, stage) => sum + stage.weight, 0);
  if (total !== 100) {
    throw new Error(`Company verification weights must total 100; received ${total}.`);
  }
}

export function buildCompanyVerificationStages(
  statuses: Record<CompanyVerificationStageId, CompanyVerificationStageStatus>,
  reasons: Partial<Record<CompanyVerificationStageId, string>> = {},
): CompanyVerificationStage[] {
  assertCompanyVerificationWeights();
  return companyVerificationStageDefinitions.map((definition) => ({
    ...definition,
    status: statuses[definition.id],
    ...(reasons[definition.id] ? { reason: reasons[definition.id] } : {}),
  }));
}