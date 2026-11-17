import type { ReviewListing } from "@/features/employer-listings/types";

export const fallbackListing: ReviewListing = {
  id: "frontend-developer",
  title: "Frontend Developer",
  type: "Job",
  category: "Digital Banking",
  location: "BGC, Taguig City",
  department: "Product",
  applicants: 48,
  shortlisted: 9,
  status: "active",
  updated: "Updated today by 9:42 AM",
  description:
    "Build secure, accessible digital banking experiences used by customers across the Philippines.",
  responsibilities: [
    "Ship polished web experiences for customer-facing banking journeys.",
    "Collaborate with design and product to improve usability and accessibility.",
    "Maintain a high-quality frontend architecture with reusable components.",
  ],
  hiring: {
    type: "Full-time",
    schedule: "Hybrid",
    schoolPartnerships: "Open to software engineering students and graduates.",
    workspace: "BGC, Taguig City",
  },
};

export const statusBadgeClasses: Record<string, string> = {
  confirmed: "border border-[#d5f1e5] bg-[#ecf9f5] text-[#1d9d75]",
  needs_changes: "border border-[#f6e6b6] bg-[#fff6df] text-[#bd8a12]",
  pending_confirmation: "border border-[#dfeae8] bg-[#f3f8f8] text-[#4d6367]",
};

export const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  needs_changes: "Needs changes",
  pending_confirmation: "Pending confirmation",
};
