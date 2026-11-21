import { useCallback, useEffect, useRef, useState } from "react";
import {
  getApplicantById,
  recordApplicantEmploymentEnd,
  updateApplicantStatus,
} from "@/features/employer-applicants/api";
import { useAuth } from "@/features/auth/useAuth";
import { applicantStatusConfig, isAllowedApplicantTransition } from "@/features/employer-applicants/statuses";
import type { ApplicantStatus } from "@/features/employer-applicants/statuses";
import type { Applicant, ApplicantStatusHistoryEntry, ApplicantStatusUpdatePayload } from "@/features/employer-applicants/types";

type PendingTransition = {
  to: ApplicantStatus;
  payload: ApplicantStatusUpdatePayload;
};

export function useApplicantStatus(applicantId: string) {
  const { token, status: authStatus } = useAuth();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [status, setStatus] = useState<ApplicantStatus | null>(null);
  const [history, setHistory] = useState<ApplicantStatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employmentError, setEmploymentError] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const retryTransition = useRef<PendingTransition | null>(null);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadSequence.current;
    if (!token || authStatus === "loading") return;
    try {
      const loadedApplicant = await getApplicantById(token, applicantId);
      if (requestId !== loadSequence.current) return;
      if (!loadedApplicant) {
        setError("Applicant not found.");
        return;
      }
      setApplicant(loadedApplicant);
      setStatus(loadedApplicant.status);
      setHistory([...(loadedApplicant.statusHistory ?? [])].reverse());
    } catch (requestError: unknown) {
      if (requestId === loadSequence.current) setError(requestError instanceof Error ? requestError.message : "Unable to load applicant stage.");
    } finally {
      if (requestId === loadSequence.current) setIsLoading(false);
    }
  }, [applicantId, authStatus, token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => { loadSequence.current += 1; };
  }, [load]);

  async function transitionTo(
    to: ApplicantStatus,
    payload: ApplicantStatusUpdatePayload = {},
  ): Promise<boolean> {
    if (!status || requestInFlight.current) return false;

    const from = status;
    if (!isAllowedApplicantTransition(from, to)) {
      setError(`Cannot move from ${applicantStatusConfig[from].label} to ${applicantStatusConfig[to].label}.`);
      return false;
    }

    requestInFlight.current = true;
    setIsSaving(true);
    setError(null);
    const priorHistory = history;
    const priorApplicant = applicant;
    if (!priorApplicant) {
      requestInFlight.current = false;
      setIsSaving(false);
      setError("Applicant details are unavailable. Reload the page before changing this application.");
      return false;
    }
    const changedAt = new Date().toISOString();
    const optimisticEntry: ApplicantStatusHistoryEntry = {
      from,
      to,
      changedBy: "Saving…",
      changedAt,
      ...(payload.note ? { note: payload.note } : {}),
    };

    setStatus(to);
    setHistory((current) => [optimisticEntry, ...current]);

    try {
      if (!token) throw new Error("Your employer session has expired.");
      const updatedApplicant = await updateApplicantStatus(token, applicantId, to, priorApplicant, payload);
      setApplicant(updatedApplicant);
      setStatus(updatedApplicant.status);
      setHistory([...(updatedApplicant.statusHistory ?? [])].reverse());
      retryTransition.current = null;
      return true;
    } catch (requestError) {
      setApplicant(priorApplicant);
      setStatus(from);
      setHistory(priorHistory);
      retryTransition.current = { to, payload };
      setError(requestError instanceof Error ? requestError.message : "Unable to save this stage change. Your update was rolled back.");
      return false;
    } finally {
      requestInFlight.current = false;
      setIsSaving(false);
    }
  }

  async function advance(payload: ApplicantStatusUpdatePayload = {}) {
    if (!status) return false;
    const nextStage = applicantStatusConfig[status].nextStage;
    if (!nextStage) return false;
    return transitionTo(nextStage, payload);
  }

  async function reject(payload: ApplicantStatusUpdatePayload = {}) {
    return transitionTo("rejected", payload);
  }

  async function retry() {
    const pending = retryTransition.current;
    if (!pending) return false;
    return transitionTo(pending.to, pending.payload);
  }

  async function recordEmploymentEnd(employmentEndedAt: string): Promise<boolean> {
    if (!applicant || status !== "hired" || requestInFlight.current) return false;

    requestInFlight.current = true;
    setIsSaving(true);
    setEmploymentError(null);
    try {
      if (!token) throw new Error("Your employer session has expired.");
      const updatedApplicant = await recordApplicantEmploymentEnd(
        token,
        applicantId,
        employmentEndedAt,
        applicant,
      );
      setApplicant(updatedApplicant);
      return true;
    } catch (requestError) {
      setEmploymentError(requestError instanceof Error ? requestError.message : "Unable to record the employment end date.");
      return false;
    } finally {
      requestInFlight.current = false;
      setIsSaving(false);
    }
  }

  return {
    status,
    applicant,
    history,
    isLoading,
    isSaving,
    error,
    employmentError,
    reload: () => {
      setIsLoading(true);
      setError(null);
      void load();
    },
    advance,
    reject,
    retry,
    recordEmploymentEnd,
  };
}
