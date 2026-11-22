export type VerificationStatus = "incomplete" | "pending" | "approved" | "rejected";
export type UserRole = "Applicant" | "Employer" | "Admin";
export type UserStatus = "Active" | "Inactive";
export type CategoryIcon =
  | "design"
  | "engineering"
  | "people"
  | "marketing"
  | "sales"
  | "support"
  | "general";

export interface VerificationDocument {
  id: string;
  name: string;
  url?: string;
}

export interface EmployerVerification {
  id: string;
  company: string;
  initials: string;
  submittedBy: string;
  submittedAt: string;
  status: VerificationStatus;
  documents: VerificationDocument[];
  rejectionReason?: string;
}

export interface AdminOutletContext {
  verifications: EmployerVerification[];
  pendingCount: number;
  pendingApplicantIdentityCount: number;
  updateVerification: (
    id: string,
    status: VerificationStatus,
    reason?: string,
  ) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  retry?: () => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  joined: string;
  status: UserStatus;
  identityVerification?: {
    status: "pending" | "verified" | "rejected";
    rejectionReason: string | null;
  } | null;
  companyVerification?: {
    id: string;
    companyName: string;
    status: VerificationStatus;
    rejectionReason: string | null;
  } | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  jobCount: number;
  icon: CategoryIcon;
}

export interface CategoryFormValues {
  name: string;
  description: string;
  icon?: CategoryIcon;
}

export interface TopJob {
  id: string;
  title: string;
  company: string;
  applications: number;
}
