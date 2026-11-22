export type EmployerStatus =
  | "email_unverified"
  | "docs_required"
  | "pending_review"
  | "rejected"
  | "approved";

export type EmployerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  companyName: string;
  website: string;
  companySize: string;
  industry: string;
  companyRole: string;
  status: EmployerStatus;
  rejectionReason?: string;
};

export const employerCompanySizes = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
] as const;

export type EmployerRegistrationInput = Omit<
  EmployerProfile,
  "id" | "status" | "rejectionReason"
> & {
  password: string;
  passwordConfirmation: string;
  termsAccepted: boolean;
  otherIndustry: string;
};

export type EmployerRouteAccess =
  | "register"
  | "verify-email"
  | "verification"
  | "under-review"
  | "dashboard";