export type OnboardingStatus =
  | "pending_confirmation"
  | "confirmed"
  | "needs_changes";

export type ReviewListing = {
  id: string;
  title: string;
  type: "Job" | "OJT";
  category: string;
  location: string;
  department: string;
  applicants: number;
  shortlisted: number;
  status: "active" | "draft" | "closed";
  updated: string;
  description: string;
  responsibilities: string[];
  hiring: {
    type: string;
    schedule: string;
    schoolPartnerships: string;
    workspace: string;
  };
};

export type ReviewLocationState = {
  listing?: ReviewListing;
};

export type ReviewDraftValues = {
  title: string;
  category: string;
  location: string;
  department: string;
  type: "Job" | "OJT";
  schedule: string;
  workspace: string;
  schoolPartnerships: string;
  acceptedCourses: string;
  description: string;
  responsibilities: string;
};

export type DefaultsSnapshot = {
  hiringFor: string;
  defaultWorkspace: string;
  schoolPartnerships: string;
  acceptedCourses: string[];
  listingType: "Job" | "OJT";
};

export type ListingOnboarding = {
  listingId: string;
  status: OnboardingStatus;
  confirmedAt: string | null;
  confirmedBy: string | null;
  defaultsSnapshot: DefaultsSnapshot | null;
  requiresAttentionNote: string | null;
  updatedAt: string | null;
};
