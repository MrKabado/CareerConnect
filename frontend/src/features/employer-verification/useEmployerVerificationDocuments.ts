import { useSyncExternalStore } from "react";
import {
  getEmployerVerificationDocuments,
  subscribeEmployerVerificationDocuments,
} from "@/features/employer-verification/api";

export function useEmployerVerificationDocuments(employerId: string) {
  return useSyncExternalStore(
    subscribeEmployerVerificationDocuments,
    () => getEmployerVerificationDocuments(employerId),
    () => getEmployerVerificationDocuments(employerId),
  );
}
