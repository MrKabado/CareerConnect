import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import {
  employerRegistrationApi,
  getEmployerStatusPath,
} from "@/features/employer-registration/api";
import { useAuth } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/axios";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";
import { PageSkeleton } from "@/components/ui/skeleton";
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
  const { user, token, status: authStatus, error: authError, refresh } = useAuth();
  const verification = useCompanyVerification();
  const [demoError, setDemoError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [serverStatusError, setServerStatusError] = useState<string | null>(null);
  const [isServerStatusLoading, setIsServerStatusLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState(0);
  const isAuthenticatedEmployer = user?.role === "employer";
  const usesBackendStatus =
    isAuthenticatedEmployer &&
    (access === "verification" || access === "under-review" || access === "dashboard");
  const isMayaDemoSetup =
    import.meta.env.DEV && access === "dashboard" && !employer && !isAuthenticatedEmployer;

  useEffect(() => {
    if (!usesBackendStatus || !token) return;

    let active = true;
    setIsServerStatusLoading(true);
    setServerStatusError(null);
    employerVerificationFilesApi
      .status(token)
      .then((response) => {
        if (active) setServerStatus(response.status);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          setServerStatusError("Your session has expired. Sign in again to continue.");
        } else {
          setServerStatusError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your employer verification status.",
          );
        }
      })
      .finally(() => {
        if (active) setIsServerStatusLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryStatus, token, usesBackendStatus]);

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

  if (
    authStatus === "loading" &&
    token &&
    (access === "verification" || access === "under-review" || access === "dashboard")
  ) {
    return <PageSkeleton className="min-h-dvh" label="Loading employer account" />;
  }

  if (
    (access === "verification" || access === "under-review") &&
    !isAuthenticatedEmployer &&
    !isMayaDemoSetup
  ) {
    if (authStatus === "authenticated") return <Navigate replace to="/job-search" />;
    if (authStatus === "error") {
      return (
        <main className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="max-w-md">
            <p className="text-sm text-red-700" role="alert">
              {authError ?? "Your employer account could not be verified."}
            </p>
            <button
              className="mt-4 rounded-lg bg-[#078b8d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#066f72]"
              onClick={() => void refresh()}
              type="button"
            >
              Return to login
            </button>
          </div>
        </main>
      );
    }
    return <Navigate replace to="/login" />;
  }

  if (usesBackendStatus) {
    if (authStatus === "loading" || isServerStatusLoading) {
      return <PageSkeleton className="min-h-dvh" label="Loading employer status" />;
    }

    if (authStatus !== "authenticated" || !token) {
      return <Navigate replace to="/login" />;
    }

    if (serverStatusError) {
      return (
        <main className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="max-w-md">
            <p className="text-sm text-red-700" role="alert">{serverStatusError}</p>
            <button
              className="mt-4 rounded-lg bg-[#078b8d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#066f72]"
              onClick={() => setRetryStatus((current) => current + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        </main>
      );
    }

    if (serverStatus === null) {
      return <PageSkeleton className="min-h-dvh" label="Loading employer status" />;
    }

    if (access === "verification") {
      if (serverStatus === "incomplete" || serverStatus === "rejected") return children;
      return (
        <Navigate
          replace
          to={serverStatus === "pending" ? "/employer/under-review" : "/employer/overview"}
        />
      );
    }

    if (access === "under-review") {
      if (serverStatus === "pending") return children;
      return (
        <Navigate
          replace
          to={serverStatus === "verified" ? "/employer/overview" : "/employer/verification"}
        />
      );
    }

    if (serverStatus === "verified") return children;
    return (
      <Navigate
        replace
        to={serverStatus === "pending" ? "/employer/under-review" : "/employer/verification"}
      />
    );
  }

  if (authStatus === "authenticated" && user?.role !== "employer" && access !== "register") {
    return <Navigate replace to="/job-search" />;
  }

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