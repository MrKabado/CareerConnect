import { useCallback, useState } from "react";
import { initialVerifications } from "../data/mock";
import type { AdminOutletContext, EmployerVerification } from "../../types";

/** Verification list + status changes. Swap the initial state for an API load later. */
export function useVerifications(): AdminOutletContext {
  const [verifications, setVerifications] =
    useState<EmployerVerification[]>(initialVerifications);

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  const updateVerification = useCallback<AdminOutletContext["updateVerification"]>(
    (id, status, reason) =>
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, status, rejectionReason: status === "rejected" ? reason : undefined }
            : v
        )
      ),
    []
  );

  return { verifications, pendingCount, updateVerification };
}
