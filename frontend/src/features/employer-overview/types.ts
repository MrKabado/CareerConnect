export type OverviewStatCard = {
  label: string;
  value: number;
  detail: string;
  accent: string;
};

export type OverviewPipelineItem = {
  label: string;
  count: number;
  color: string;
};

export type HiringSetupItem = {
  title: string;
  subtitle: string;
  count: number;
};

export type JobRow = {
  title: string;
  type: "Job" | "OJT";
  location: string;
  applicants: number;
  status: string;
  tone: string;
};
