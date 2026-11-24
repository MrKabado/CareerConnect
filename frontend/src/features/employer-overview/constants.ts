import type {
  HiringSetupItem,
  JobRow,
  OverviewPipelineItem,
  OverviewStatCard,
} from "@/features/employer-overview/types";

export const statCards: OverviewStatCard[] = [
  {
    label: "Active listings",
    value: 4,
    detail: "2 active · 2 OJT",
    accent: "text-[#168b87]",
  },
  {
    label: "Total applicants",
    value: 120,
    detail: "4 recent profiles",
    accent: "text-[#354346]",
  },
  {
    label: "Open positions",
    value: 10,
    detail: "Across 4 departments",
    accent: "text-[#354346]",
  },
  {
    label: "Hired",
    value: 8,
    detail: "This quarter",
    accent: "text-[#31a581]",
  },
];

export const pipeline: OverviewPipelineItem[] = [
  { label: "Applied", count: 42, color: "#1e9fe5" },
  { label: "Under Review", count: 31, color: "#6a5ff4" },
  { label: "Interview Scheduled", count: 17, color: "#39b3ab" },
  { label: "Hired", count: 8, color: "#1db56d" },
  { label: "Rejected", count: 12, color: "#f15d6b" },
];

export const hiringSetup: HiringSetupItem[] = [
  {
    title: "Jobs",
    subtitle: "1 role",
    count: 2,
  },
  {
    title: "OJT & Internships",
    subtitle: "6 OJT · 3 internship roles",
    count: 9,
  },
];

export const jobRows: JobRow[] = [
  {
    title: "Frontend Developer",
    type: "Job",
    location: "Remote",
    applicants: 48,
    status: "Active",
    tone: "bg-[#eafaf2] text-[#1d9d6a]",
  },
  {
    title: "Software Engineer",
    type: "OJT",
    location: "Hybrid",
    applicants: 31,
    status: "Review",
    tone: "bg-[#edf5ff] text-[#2d6ccc]",
  },
  {
    title: "Customer Experience Specialist",
    type: "Job",
    location: "On-site",
    applicants: 27,
    status: "Review",
    tone: "bg-[#edf5ff] text-[#2d6ccc]",
  },
  {
    title: "Operations Trainer",
    type: "OJT",
    location: "Remote",
    applicants: 14,
    status: "Review",
    tone: "bg-[#edf5ff] text-[#2d6ccc]",
  },
];
