import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { getEmployerApplicants } from "@/features/employer-applicants/api";
import type { Applicant } from "@/features/employer-applicants/types";

export function useEmployerApplicants() {
  const { token, status: authStatus } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!token || authStatus === "loading") return;
    try {
      const response = await getEmployerApplicants(token);
      if (requestId === requestSequence.current) {
        setApplicants(response.applicants);
        setCurrentPage(response.currentPage);
        setLastPage(response.lastPage);
        setTotal(response.total);
      }
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load applicant records.");
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [authStatus, token]);

  const loadMore = useCallback(async () => {
    if (!token || isLoadingMore || currentPage >= lastPage) return;
    const requestId = ++requestSequence.current;
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await getEmployerApplicants(token, currentPage + 1);
      if (requestId === requestSequence.current) {
        setApplicants((current) => [...current, ...response.applicants]);
        setCurrentPage(response.currentPage);
        setLastPage(response.lastPage);
        setTotal(response.total);
      }
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load more applicant records.");
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoadingMore(false);
    }
  }, [currentPage, isLoadingMore, lastPage, token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  return {
    applicants,
    isLoading,
    isLoadingMore,
    error,
    total,
    hasMore: currentPage < lastPage,
    retry: async () => {
      setIsLoading(true);
      setError(null);
      await load();
    },
    loadMore,
  };
}
