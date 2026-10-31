import type { VerificationStatus } from "../../types";

const STYLES: Record<VerificationStatus, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-700" },
  approved: { label: "Approved", classes: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", classes: "bg-red-50 text-red-700" },
};

export default function StatusBadge({ status }: { status: VerificationStatus }) {
  const { label, classes } = STYLES[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
