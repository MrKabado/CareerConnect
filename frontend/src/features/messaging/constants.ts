export const employerMessageFilters = [
  ["all", "All"],
  ["unread", "Unread"],
  ["needs-reply", "Needs reply"],
  ["listing", "By listing"],
] as const;

export type EmployerMessageFilter = (typeof employerMessageFilters)[number][0];
