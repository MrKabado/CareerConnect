import type { EmployerListingStatus } from "@/features/employer-listings/listings";

export default function StatusPill({ status }: { status: EmployerListingStatus }) {
  const styles = {
    active: "bg-[#ecf9f5] text-[#1d9d75] border border-[#d5f1e5]",
    draft: "bg-[#fff6df] text-[#bd8a12] border border-[#f6e6b6]",
    closed: "bg-[#fbe8e8] text-[#c65d5d] border border-[#f1c8c8]",
    full: "bg-[#e8f0ff] text-[#4d6fa8] border border-[#cddaf2]",
    expired: "bg-[#f3eee8] text-[#9a7a55] border border-[#e7dac9]",
    deactivated: "bg-[#f1f2f2] text-[#768183] border border-[#dde2e2]",
  } as const;

  const label = status === "active"
    ? "Open"
    : status === "draft"
      ? "Draft"
      : status === "full"
        ? "Full"
        : status === "expired"
          ? "Expired"
          : status === "deactivated"
            ? "Deactivated"
            : "Closed";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${styles[status]}`}>
      {label}
    </span>
  );
}
