import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { applicationStore } from "@/features/applications/applicationData";
import {
  StatusBadge,
  Surface,
} from "@/components/ui/applications/applicationsComponent";

export default function ApplicationStatusList() {
  const applications = useSyncExternalStore(
    applicationStore.subscribe,
    applicationStore.getSnapshot,
    applicationStore.getSnapshot,
  );

  return (
    <section className="mt-7" aria-labelledby="recent-applications-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className="text-[16px] font-bold tracking-[-0.25px] text-[#344749]"
            id="recent-applications-heading"
          >
            Your applications
          </h2>
          <p className="mt-1 text-[10px] text-[#92a0a1]">
            Track the status of opportunities you’ve applied for.
          </p>
        </div>
        <Link
          className="rounded text-[10px] font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          to="/applications"
        >
          View all
        </Link>
      </div>
      <Surface>
        <div className="grid grid-cols-[minmax(0,1fr)_112px_150px] gap-3 border-b border-[#edf1f1] bg-[#fbfcfc] px-4 py-2.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5] max-[600px]:grid-cols-[minmax(0,1fr)_auto]">
          <span>Opportunity</span>
          <span className="max-[600px]:hidden">Applied</span>
          <span>Status</span>
        </div>
        {applications.map((application) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_112px_150px] items-center gap-3 border-b border-[#edf1f1] px-4 py-2.5 last:border-b-0 max-[600px]:grid-cols-[minmax(0,1fr)_auto] max-[600px]:gap-2 max-[600px]:px-3"
            key={application.id}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e6f6f3] text-[10px] font-bold text-[#178b87]">
                {application.companyInitial}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-[10px] font-semibold text-[#354346]">
                    {application.title}
                  </p>
                  {application.track === "OJT" && (
                    <span className="shrink-0 rounded bg-[#fff0dc] px-1.5 py-0.5 text-[8px] font-semibold text-[#bd852d]">
                      OJT
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[9px] text-[#879596]">
                  {application.company}
                </p>
              </div>
            </div>
            <span className="text-[9px] text-[#879596] max-[600px]:hidden">
              {application.appliedAt}
            </span>
            <span className="justify-self-start max-[600px]:justify-self-end">
              <StatusBadge status={application.status} />
            </span>
          </div>
        ))}
      </Surface>
    </section>
  );
}
