import { useEffect, useState } from "react";
import { formatEmploymentTenure } from "@/features/applications/employmentTenure";

export default function EmploymentTenureCounter({
  startedAt,
  endedAt,
}: {
  startedAt: string;
  endedAt?: string | null;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (endedAt) return;

    const initialTimeout = window.setTimeout(() => setNow(Date.now()), 0);
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(initialTimeout);
      window.clearInterval(intervalId);
    };
  }, [endedAt]);

  if (!endedAt && now === null) return <>Calculating…</>;

  return <>{formatEmploymentTenure(startedAt, endedAt, now ?? 0) ?? "Date unavailable"}</>;
}
