export const verificationDocumentRequirements = [
  { kind: "business_registration", label: "Business permit, license, or certification" },
  { kind: "company_id", label: "Company ID" },
  { kind: "employer_id_primary", label: "Employer valid ID 1" },
] as const;

export type VerificationDocumentKind =
  (typeof verificationDocumentRequirements)[number]["kind"];

export type EmployerVerificationDocument = {
  id: string;
  employerId: string;
  kind: VerificationDocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};
