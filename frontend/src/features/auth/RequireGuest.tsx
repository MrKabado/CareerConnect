import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/useAuth";

function dashboardPath(role: "admin" | "applicant" | "employer") {
  if (role === "admin") return "/admin";
  if (role === "employer") return "/employer/overview";
  return "/profile";
}

export default function RequireGuest({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <main className="min-h-dvh bg-[#f5f8f8]">
        <PageSkeleton className="min-h-dvh" label="Loading your account" />
      </main>
    );
  }

  if (status === "authenticated" && user) {
    return <Navigate replace to={dashboardPath(user.role)} />;
  }

  return children;
}
