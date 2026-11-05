export type ApplicationFileKind = "resume" | "letter" | "cover-letter";

export type ApplicationOpportunityTrack = "Job" | "OJT";

export type ApplicationOpportunity = {
  id: string;
  company: string;
  initials: string;
  title: string;
  location: string;
  category: string;
  arrangement: string;
  salary: string;
  track: ApplicationOpportunityTrack;
};
