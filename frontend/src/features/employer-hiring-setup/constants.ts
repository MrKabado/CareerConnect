export const defaultHiringSetup = {
  title: "Frontend Developer",
  department: "Product",
  location: "BGC, Taguig City",
  workspace: "Hybrid",
  schoolPartnerships: "Open to software engineering students and graduates.",
  acceptedCourses: "Computer Science, Information Technology, Software Engineering",
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
