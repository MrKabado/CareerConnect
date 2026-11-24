export type AccountRole = "admin" | "applicant" | "employer";

export function roleLandingPath(role: AccountRole): string {
  if (role === "admin") return "/admin";
  if (role === "employer") return "/employer/overview";
  return "/profile";
}
