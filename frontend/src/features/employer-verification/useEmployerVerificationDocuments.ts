import { useCallback, useEffect, useState } from "react";
import type { EmployerVerificationDocument } from "@/features/employer-verification/types";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";

export function useEmployerVerificationDocuments(
  token: string | null,
  employerId: string | null,
) {
  const [documents, setDocuments] = useState<EmployerVerificationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !employerId) return;
    try {
      setDocuments(await employerVerificationFilesApi.list(token, employerId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load verification documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [employerId, token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return {
    documents,
    isLoading,
    error,
    refresh: async () => {
      setIsLoading(true);
      setError(null);
      await load();
    },
  };
}
