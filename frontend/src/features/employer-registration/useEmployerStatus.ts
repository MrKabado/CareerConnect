import { useSyncExternalStore } from "react";
import { employerRegistrationApi } from "@/features/employer-registration/api";

export function useEmployerStatus() {
  const employer = useSyncExternalStore(
    employerRegistrationApi.subscribe,
    employerRegistrationApi.getSnapshot,
    employerRegistrationApi.getSnapshot,
  );

  return {
    employer,
    status: employer?.status ?? null,
  };
}