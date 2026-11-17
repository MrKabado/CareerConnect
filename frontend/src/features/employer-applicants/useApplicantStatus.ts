import { useEffect, useRef, useState } from "react";
import { getApplicantById, getHistory, updateApplicantStatus } from "@/features/employer-applicants/api";
import { applicantStatusConfig, isAllowedApplicantTransition } from "@/features/employer-applicants/statuses";
import type { ApplicantStatus } from "@/features/employer-applicants/statuses";
import type { Applicant, ApplicantStatusHistoryEntry, ApplicantStatusUpdatePayload } from "@/features/employer-applicants/types";

type PendingTransition = {
  to: ApplicantStatus;
  payload: ApplicantStatusUpdatePayload;
};

export function useApplicantStatus(applicantId: string) {
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [status, setStatus] = useState<ApplicantStatus | null>(null);
  const [history, setHistory] = useState<ApplicantStatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const retryTransition = useRef<PendingTransition | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([getApplicantById(applicantId), getHistory(applicantId)])
      .then(([applicant, entries]) => {
        if (!isCurrent) return;
        if (!applicant) {
          setError("Applicant not found.");
          return;
        }
        setApplicant(applicant);
        setStatus(applicant.status);
        setHistory(entries.reverse());
      })
      .catch(() => {
        if (isCurrent) setError("Unable to load applicant stage. Please try again.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [applicantId]);

  async function transitionTo(
    to: ApplicantStatus,
    payload: ApplicantStatusUpdatePayload = {},
  ): Promise<boolean> {
    if (!status || requestInFlight.current) return false;

    const from = status;
    const undoRejection = payload.undoRejection === true && from === "rejected";
    if (!undoRejection && !isAllowedApplicantTransition(from, to)) {
      setError(`Cannot move from ${applicantStatusConfig[from].label} to ${applicantStatusConfig[to].label}.`);
      return false;
    }

    requestInFlight.current = true;
    setIsSaving(true);
    setError(null);
    const priorHistory = history;
    const priorApplicant = applicant;
    const changedAt = new Date().toISOString();
    const optimisticEntry: ApplicantStatusHistoryEntry = {
      from,
      to,
      changedBy: payload.changedBy ?? "Maya Philippines",
      changedAt,
      ...(payload.note ? { note: payload.note } : {}),
    };

    setStatus(to);
    setHistory((current) => [optimisticEntry, ...current]);

    try {
      const updatedApplicant = await updateApplicantStatus(applicantId, to, payload);
      setApplicant(updatedApplicant);
      setStatus(updatedApplicant.status);
      setHistory([...(updatedApplicant.statusHistory ?? [])].reverse());
      retryTransition.current = null;
      return true;
    } catch {
      setApplicant(priorApplicant);
      setStatus(from);
      setHistory(priorHistory);
      retryTransition.current = { to, payload };
      setError("Unable to save this stage change. Your update was rolled back.");
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

  async function undoReject(previousStatus: ApplicantStatus) {
    if (status !== "rejected") return false;
    return transitionTo(previousStatus, { undoRejection: true });
  }

  async function retry() {
    const pending = retryTransition.current;
    if (!pending) return false;
    return transitionTo(pending.to, pending.payload);
  }

  return {
    status,
    applicant,
    history,
    isLoading,
    isSaving,
    error,
    advance,
    reject,
    undoReject,
    retry,
  };
}
