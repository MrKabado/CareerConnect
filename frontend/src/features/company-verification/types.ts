import type { EditableCompanyProfile } from "@/features/companies/companyProfiles";
import type { CompanyMediaCollection } from "@/features/company-profile/types";

export type CompanyVerificationStageId =
  | "email_verification"
  | "company_information"
  | "legal_documents"
  | "verification_review"
  | "hiring_setup"
  | "company_media";

export type CompanyVerificationStageStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "needs_changes"
  | "complete"
  | "locked";

export type CompanyEntityType =
  | "sole_proprietor"
  | "company"
  | "agency_recruiter"
  | "public_or_nonprofit";

export type CompanyVerificationInformation = Pick<
  EditableCompanyProfile,
  "website" | "industry" | "teamSize" | "overview"
> & {
  legalName: string;
  country: string;
  entityType: CompanyEntityType;
  registrationNumber: string;
  userRole: string;
};

export type CompanyVerificationRiskFlag = {
  id:
    | "free_email_domain"
    | "domain_mismatch"
    | "registry_mismatch"
    | "recruitment_license";
  reason: string;
};

export type CompanyVerificationReviewStatus =
  | "not_submitted"
  | "submitted"
  | "needs_changes"
  | "approved";

export type CompanyVerificationRecord = {
  emailCodeRequested?: boolean;
  emailVerifiedAt?: string;
  companyInformation?: CompanyVerificationInformation;
  registryMismatch?: boolean;
  legalDocumentsStarted?: boolean;
  legalDocumentsSubmitted?: boolean;
  reviewStatus?: CompanyVerificationReviewStatus;
  reviewReason?: string;
  hiringDefaultsComplete?: boolean;
  media?: CompanyMediaCollection;
};

export type CompanyVerificationStage = {
  id: CompanyVerificationStageId;
  label: string;
  description: string;
  weight: number;
  status: CompanyVerificationStageStatus;
  hint: string;
  route: string;
  reason?: string;
};

export type CompanyVerificationAction = {
  stageId: CompanyVerificationStageId;
  label: string;
  route: string;
};

export type CompanyVerificationSnapshot = {
  employerId: string | null;
  record: CompanyVerificationRecord;
  stages: CompanyVerificationStage[];
  percent: number;
  nextAction: CompanyVerificationAction;
  currentStage: CompanyVerificationStage | null;
  firstIncompleteRequiredStage: CompanyVerificationStage | null;
  riskFlags: CompanyVerificationRiskFlag[];
  dashboardReady: boolean;
};