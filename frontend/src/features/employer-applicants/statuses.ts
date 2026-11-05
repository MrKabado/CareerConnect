export const offerExtendedStatus = {
  id: "offer_extended",
  label: "Offer Extended",
  order: 4,
  badgeClass: "border-[#f4e3bf] bg-[#fff7e6] text-[#9b711d]",
  icon: "file-check",
} as const;

export const forwardApplicantStatuses = [
  { id: "applied", label: "Applied", order: 0, badgeClass: "border-[#dfe9ee] bg-[#eef3f6] text-[#4e6871]", icon: "inbox" },
  { id: "under_review", label: "Under Review", order: 1, badgeClass: "border-[#d5e5ff] bg-[#edf5ff] text-[#356bcc]", icon: "eye" },
  { id: "shortlisted", label: "Shortlisted", order: 2, badgeClass: "border-[#dfeee7] bg-[#edf8f2] text-[#1d9d75]", icon: "star" },
  { id: "interview_scheduled", label: "Interview Scheduled", order: 3, badgeClass: "border-[#eadcff] bg-[#f8f0ff] text-[#7a5ec8]", icon: "calendar" },
  offerExtendedStatus,
  { id: "hired", label: "Hired", order: 5, badgeClass: "border-[#cfece0] bg-[#e8f8f0] text-[#187850]", icon: "check" },
] as const;

export type ForwardApplicantStatus = (typeof forwardApplicantStatuses)[number]["id"];
export type ApplicantStatus = ForwardApplicantStatus | "rejected";
export type ApplicantStatusIcon = (typeof forwardApplicantStatuses)[number]["icon"] | "x";

export const applicantStatusConfig: Record<ApplicantStatus, {
  label: string;
  order: number | null;
  badgeClass: string;
  icon: ApplicantStatusIcon;
  nextStage: ApplicantStatus | null;
}> = {
  applied: { label: "Applied", order: 0, badgeClass: forwardApplicantStatuses[0].badgeClass, icon: "inbox", nextStage: "under_review" },
  under_review: { label: "Under Review", order: 1, badgeClass: forwardApplicantStatuses[1].badgeClass, icon: "eye", nextStage: "shortlisted" },
  shortlisted: { label: "Shortlisted", order: 2, badgeClass: forwardApplicantStatuses[2].badgeClass, icon: "star", nextStage: "interview_scheduled" },
  interview_scheduled: { label: "Interview Scheduled", order: 3, badgeClass: forwardApplicantStatuses[3].badgeClass, icon: "calendar", nextStage: "offer_extended" },
  offer_extended: { label: offerExtendedStatus.label, order: offerExtendedStatus.order, badgeClass: offerExtendedStatus.badgeClass, icon: offerExtendedStatus.icon, nextStage: "hired" },
  hired: { label: "Hired", order: 5, badgeClass: "border-[#cfece0] bg-[#e8f8f0] text-[#187850]", icon: "check", nextStage: null },
  rejected: { label: "Rejected", order: null, badgeClass: "border-[#f4d4d6] bg-[#fbe9e9] text-[#b85054]", icon: "x", nextStage: null },
};

export const applicantStatusOrder = forwardApplicantStatuses.map(({ id }) => id);
export const applicantStatuses = [...applicantStatusOrder, "rejected"] as const;
export const applicantStatusLabels = Object.fromEntries(
  Object.entries(applicantStatusConfig).map(([status, config]) => [status, config.label]),
) as Record<ApplicantStatus, string>;

export const allowedApplicantTransitions: Record<ApplicantStatus, readonly ApplicantStatus[]> = {
  applied: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["interview_scheduled", "rejected"],
  interview_scheduled: ["offer_extended", "rejected"],
  offer_extended: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

export function isAllowedApplicantTransition(
  from: ApplicantStatus,
  to: ApplicantStatus,
): boolean {
  return allowedApplicantTransitions[from].includes(to);
}