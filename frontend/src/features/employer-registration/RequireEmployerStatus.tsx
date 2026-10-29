import { useState, type ReactNode } from "react";
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
  const { employer } = useEmployerStatus();
  const [error, setError] = useState<string | null>(null);

  if (!import.meta.env.DEV || !employer) return null;

  function setStatus(status: "approved" | "rejected") {
    try {
      employerRegistrationApi.setStatusForDevelopment(
        status,
        status === "rejected"
          ? "The uploaded company documents could not be verified. Please review and resubmit."
          : undefined,
      );
      setError(null);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to change employer status.",
      );
    }
  }

  return (
    <aside className="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-[#d8e6e3] bg-white p-3 shadow-lg">
      <p className="text-[9px] font-semibold text-[#526365]">
        Dev status: {employer.status}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          className="rounded-md bg-[#e6f4ea] px-2.5 py-1.5 text-[9px] font-semibold text-[#287a45]"
          onClick={() => setStatus("approved")}
          type="button"
        >
          Set approved
        </button>
        <button
          className="rounded-md bg-[#fff4df] px-2.5 py-1.5 text-[9px] font-semibold text-[#9b7026]"
          onClick={() => setStatus("rejected")}
          type="button"
        >
          Set rejected
        </button>
      </div>
      {error && (
        <p className="mt-1 text-[9px] text-[#a2534c]" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}

export default function RequireEmployerStatus({
  access,
  children,
}: {
  access: EmployerRouteAccess;
  children: ReactNode;
}) {
  const { status } = useEmployerStatus();

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