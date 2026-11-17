import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import {
  employerRegistrationApi,
  getEmployerStatusPath,
} from "@/features/employer-registration/api";
import type {
  EmployerRouteAccess,
  EmployerStatus,
} from "@/features/employer-registration/types";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";

function canAccess(
  status: EmployerStatus | null,
  access: EmployerRouteAccess,
) {
  if (access === "register") return status === null;
  if (access === "verify-email") return status === "email_unverified";
  if (access === "verification") return status === "docs_required" || status === "rejected";
  if (access === "under-review") return status === "pending_review";
  return status === "approved";
}

function EmployerStatusDevTools() {
  return null;
}

export default function RequireEmployerStatus({
  access,
  children,
}: {
  access: EmployerRouteAccess;
  children: ReactNode;
}) {
  const { employer, status } = useEmployerStatus();
  const verification = useCompanyVerification();
  const [demoError, setDemoError] = useState<string | null>(null);
  const isMayaDemoSetup = import.meta.env.DEV && access === "dashboard" && !employer;

  useEffect(() => {
    if (!isMayaDemoSetup) return;

    try {
      employerRegistrationApi.createMayaDemoForDevelopment();
    } catch (error) {
      window.setTimeout(() => {
        setDemoError(
          error instanceof Error
            ? error.message
            : "Unable to set up the Maya Philippines demo account.",
        );
      }, 0);
    }
  }, [isMayaDemoSetup]);

  if (isMayaDemoSetup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3f2] px-4">
        <div className="max-w-sm rounded-2xl border border-[#d8e6e3] bg-white p-6 text-center shadow-lg">
          <h1 className="text-lg font-bold text-[#243a3c]">
            {demoError ? "Demo account setup failed" : "Setting up Maya Philippines"}
          </h1>
          <p className="mt-2 text-sm text-[#647578]">
            {demoError ??
              "Preparing an approved employer account for the development dashboard."}
          </p>
        </div>
      </main>
    );
  }

  if (access === "dashboard" && employer) {
    if (verification.dashboardReady) {
      return (
        <>
          <EmployerStatusDevTools />
          {children}
        </>
      );
    }

    return (
      <Navigate
        replace
        to={verification.firstIncompleteRequiredStage?.route ?? "/employer/verification/email"}
        state={{ employerStatusRedirect: true }}
      />
    );
  }

  if (canAccess(status, access)) {
    return (
      <>
        <EmployerStatusDevTools />
        {children}
      </>
    );
  }

  return (
    <Navigate
      replace
      to={getEmployerStatusPath(status)}
      state={{ employerStatusRedirect: true }}
    />
  );
}