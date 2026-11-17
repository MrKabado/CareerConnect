import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";

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
    return <Navigate replace to="/job-search" />;
  }

  return children;
}
