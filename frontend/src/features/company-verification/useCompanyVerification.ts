import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth/useAuth";
import {
  employerVerificationFilesApi,
  employerVerificationUpdatedEvent,
} from "@/features/employer-verification/backendApi";
import { companyVerificationApi } from "@/features/company-verification/api";

let activeSyncKey: string | null = null;
let completedSyncKey: string | null = null;
let lastSyncAt = 0;
let inFlightSync: Promise<void> | null = null;
let queuedRefreshKey: string | null = null;

function syncPersistedProgress(
  token: string,
  user: { id: number; email: string; email_verified_at: string | null },
  force = false,
): Promise<void> {
  const employerId = String(user.id);
  const syncKey = `${employerId}:${token}`;
  if (activeSyncKey === syncKey && inFlightSync) {
    if (force) queuedRefreshKey = syncKey;
    return inFlightSync;
  }

  if (activeSyncKey !== syncKey) queuedRefreshKey = null;
  const cacheWindow = force ? 0 : 30000;
  if (
    cacheWindow > 0 &&
    completedSyncKey === syncKey &&
    Date.now() - lastSyncAt < cacheWindow
  ) {
    return Promise.resolve();
  }

  activeSyncKey = syncKey;
  companyVerificationApi.beginBackendSync(employerId);

  const request = Promise.all([
    employerVerificationFilesApi.status(token),
    employerVerificationFilesApi.company(token),
    employerVerificationFilesApi.list(token, employerId),
  ])
    .then(([status, { company }, documents]) => {
      if (activeSyncKey !== syncKey) return;

      companyVerificationApi.setBackendProgress({
        employerId,
        emailVerified: user.email_verified_at !== null,
        status: status.status,
        companyExists: company !== null,
        companyName: company?.name ?? null,
        companyProfileComplete: status.company_profile_complete,
        workEmail: user.email,
        website: company?.website ?? "",
        requiredDocumentKinds: documents.map((document) => document.kind),
        rejectionReason: status.rejection_reason,
      });
      completedSyncKey = syncKey;
      lastSyncAt = Date.now();
    })
    .catch((requestError: unknown) => {
      if (activeSyncKey !== syncKey) return;
      companyVerificationApi.setBackendSyncError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to refresh your saved company verification progress.",
      );
    })
    .finally(() => {
      if (activeSyncKey === syncKey) {
        inFlightSync = null;
        if (queuedRefreshKey === syncKey) {
          queuedRefreshKey = null;
          void syncPersistedProgress(token, user, true);
        }
      }
    });

  inFlightSync = request;
  return request;
}

export function useCompanyVerification() {
  const { token, user } = useAuth();
  const snapshot = useSyncExternalStore(
    companyVerificationApi.subscribe,
    companyVerificationApi.getSnapshot,
    companyVerificationApi.getSnapshot,
  );

  useEffect(() => {
    if (!token || user?.role !== "employer") {
      activeSyncKey = null;
      completedSyncKey = null;
      inFlightSync = null;
      queuedRefreshKey = null;
      companyVerificationApi.clearBackendProgress();
      return;
    }

    const refresh = (force = false) => {
      void syncPersistedProgress(token, user, force);
    };
    refresh();
    const handleFocus = () => refresh();
    const handleVerificationUpdate = () => refresh(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener(employerVerificationUpdatedEvent, handleVerificationUpdate);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(employerVerificationUpdatedEvent, handleVerificationUpdate);
    };
  }, [token, user]);

  return snapshot;
}
