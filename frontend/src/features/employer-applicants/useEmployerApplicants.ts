import { useEffect, useState } from "react";
import { getEmployerApplicants } from "@/features/employer-applicants/api";
import type { Applicant } from "@/features/employer-applicants/types";

export function useEmployerApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void getEmployerApplicants()
      .then((records) => {
        if (isCurrent) setApplicants(records);
      })
      .catch(() => {
        if (isCurrent) setError("Unable to load applicants. Please try again.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return { applicants, isLoading, error };
}
