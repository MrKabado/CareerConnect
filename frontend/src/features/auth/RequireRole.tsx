import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { roleLandingPath } from "@/features/auth/roleLandingPath";

export default function RequireRole({
  role,
  children,
}: {
  role: "admin" | "applicant" | "employer";
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (user.role !== role) {
    return <Navigate replace to={roleLandingPath(user.role)} />;
  }

  return children;
}
