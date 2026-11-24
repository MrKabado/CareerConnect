export type ApplicationFileKind = "resume";

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
  experienceRequirement: string;
  requiredSkills: string[];
};
