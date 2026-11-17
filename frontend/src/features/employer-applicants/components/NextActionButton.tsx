import type { ApplicantStatus } from "@/features/employer-applicants/statuses";

const actionLabels: Partial<Record<ApplicantStatus, string>> = {
  applied: "Move to Under Review",
  under_review: "Shortlist",
  shortlisted: "Schedule interview",
  interview_scheduled: "Extend offer",
  offer_extended: "Mark as hired",
};

type NextActionButtonProps = {
  status: ApplicantStatus;
  disabled?: boolean;
  onClick: () => void;
};

export default function NextActionButton({ status, disabled = false, onClick }: NextActionButtonProps) {
  const label = actionLabels[status];
  if (!label) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0e8e9b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a7d8a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}