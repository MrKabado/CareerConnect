export type VerificationStatus = "pending" | "approved" | "rejected";
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
  updateVerification: (
    id: string,
    status: VerificationStatus,
    reason?: string,
  ) => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  joined: string;
  status: UserStatus;
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
