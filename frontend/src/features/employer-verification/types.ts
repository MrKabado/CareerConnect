export const verificationDocumentRequirements = [
  { kind: "business_registration", label: "Business registration document" },
  { kind: "business_permit", label: "Business permit or license" },
] as const;

export type VerificationDocumentKind =
  | (typeof verificationDocumentRequirements)[number]["kind"]
  | "supporting";

export type EmployerVerificationDocument = {
  id: string;
  employerId: string;
  kind: VerificationDocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};
