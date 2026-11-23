export type IdentityVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export function getIdentityVerificationMessage(
  status: IdentityVerificationStatus,
  rejectionReason: string | null,
): string | null {
  switch (status) {
    case "verified":
      return null;
    case "pending":
      return "Your identity verification is awaiting Admin review. Applications are available after approval.";
    case "rejected":
      return `Your identity verification was rejected${rejectionReason ? `: ${rejectionReason}` : "."} Please resubmit your documents before applying.`;
    default:
      return "Submit your identity verification and wait for Admin approval before applying.";
  }
}
