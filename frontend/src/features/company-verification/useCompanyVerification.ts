import { useSyncExternalStore } from "react";
import { companyVerificationApi } from "@/features/company-verification/api";

export function useCompanyVerification() {
  return useSyncExternalStore(
    companyVerificationApi.subscribe,
    companyVerificationApi.getSnapshot,
    companyVerificationApi.getSnapshot,
  );
}