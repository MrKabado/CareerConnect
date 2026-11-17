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

export type EmployerRegistrationInput = Omit<
  EmployerProfile,
  "id" | "status" | "rejectionReason"
> & {
  password: string;
  termsAccepted: boolean;
};

export type EmployerRouteAccess =
  | "register"
  | "verify-email"
  | "verification"
  | "under-review"
  | "dashboard";