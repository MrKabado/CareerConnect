import { useCallback, useEffect, useState } from "react";
import {
  confirmOnboarding,
  getListingOnboarding,
  requestChanges,
  resetOnboarding,
} from "@/features/employer-listings/api";
import type {
  DefaultsSnapshot,
  ListingOnboarding,
  OnboardingStatus,
} from "@/features/employer-listings/types";

export function useListingOnboarding(listingId?: string) {
  const [status, setStatus] = useState<OnboardingStatus>("pending_confirmation");
  const [snapshot, setSnapshot] = useState<DefaultsSnapshot | null>(null);
  const [record, setRecord] = useState<ListingOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listingId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await getListingOnboarding(listingId);
      setRecord(next);
      setStatus(next.status);
      setSnapshot(next.defaultsSnapshot ?? null);
    } catch {
      setError("Unable to load onboarding defaults.");
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const confirm = useCallback(
    async (confirmedBy = "Maya Philippines", nextSnapshot?: DefaultsSnapshot) => {
      if (!listingId) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const next = await confirmOnboarding(
          listingId,
          nextSnapshot ?? snapshot ?? record?.defaultsSnapshot ?? undefined,
          confirmedBy,
        );

        setRecord(next);
        setStatus(next.status);
        setSnapshot(next.defaultsSnapshot ?? null);

        return next;
      } catch {
        setError("Unable to confirm onboarding defaults.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [listingId, record, snapshot],
  );

  const requestChange = useCallback(
    async (note: string) => {
      if (!listingId) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const next = await requestChanges(listingId, note);
        setRecord(next);
        setStatus(next.status);
        setSnapshot(next.defaultsSnapshot ?? null);
        return next;
      } catch {
        setError("Unable to flag the onboarding issues.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [listingId],
  );

  const reset = useCallback(async () => {
    if (!listingId) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await resetOnboarding(listingId);
      setRecord(next);
      setStatus(next.status);
      setSnapshot(next.defaultsSnapshot ?? null);
      return next;
    } catch {
      setError("Unable to reset the onboarding status.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  return {
    status,
    snapshot,
    record,
    isLoading,
    error,
    confirm,
    requestChanges: requestChange,
    reset,
    reload: load,
  };
}

// TODO(backend): Replace localStorage mock state with real server-driven onboarding data and authorization checks.
