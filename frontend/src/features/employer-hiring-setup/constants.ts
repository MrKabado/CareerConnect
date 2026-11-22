export const defaultHiringSetup = {
  title: "",
  department: "",
  location: "",
  workspace: "",
  schoolPartnerships: "",
  acceptedCourses: "",
} as const;

export const workspaceOptions = ["Hybrid", "Remote", "On-site"] as const;

export const formFieldLabels = {
  title: "Title",
  department: "Department",
  location: "Location",
  workspace: "Work setup",
  schoolPartnerships: "School partnerships",
  acceptedCourses: "Accepted courses",
} as const;
