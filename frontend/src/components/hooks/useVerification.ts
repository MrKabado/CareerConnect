import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi } from "@/features/admin/backendApi";
import type { AdminOutletContext, EmployerVerification, VerificationStatus } from "@/types";

function mapStatus(status: string): VerificationStatus {
  if (status === "verified") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "incomplete") return "incomplete";
  return "pending";
}

export function useVerifications(): AdminOutletContext {
  const { token } = useAuth();
  const [verifications, setVerifications] = useState<EmployerVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await adminApi.companyVerifications(token);
      const records = response.data.map((record): EmployerVerification => {
        const owner = record.company.owner.name;
        const company = record.company.name;
        const submitted = record.submitted_at ? new Date(record.submitted_at) : null;
        return {
          id: String(record.id),
          company,
          initials: company.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
          submittedBy: owner,
          submittedAt: submitted && !Number.isNaN(submitted.getTime())
            ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(submitted)
            : "Date unavailable",
          status: mapStatus(record.status),
          documents: [],
          rejectionReason: record.rejection_reason ?? undefined,
        };
      });
      setVerifications(records);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load employer verification requests.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const updateVerification: AdminOutletContext["updateVerification"] = useCallback(
    async (id, status, reason) => {
      if (!token) throw new Error("Your admin session has expired.");
      setError(null);
      try {
        await adminApi.reviewCompanyVerification(
          token,
          id,
          status === "approved" ? "verified" : "rejected",
          reason,
        );
        setVerifications((current) => current.map((verification) =>
          verification.id === id
            ? { ...verification, status, rejectionReason: status === "rejected" ? reason : undefined }
            : verification,
        ));
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Unable to save the verification decision.";
        setError(message);
        throw requestError;
      }
    },
    [token],
  );

  return {
    verifications,
    pendingCount: verifications.filter((verification) => verification.status === "pending").length,
    updateVerification,
    isLoading,
    error,
    retry: () => {
      setIsLoading(true);
      setError(null);
      void load();
    },
  };
}
