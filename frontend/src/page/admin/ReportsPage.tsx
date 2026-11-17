import { Briefcase, Building2, Download, FileText, Users } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import StatCard from "../../components/admin/StatCard";
import { Button, Card, PageHeader, Select } from "../../components/common";
import { topJobs } from "../../data/mock";
import type { AdminOutletContext } from "../../types";
import { useState } from "react";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function ReportsPage() {
  const { pendingCount } = useOutletContext<AdminOutletContext>();
  const [range, setRange] = useState("30");
  const maxApplications = Math.max(...topJobs.map((j) => j.applications));

  return (
    <section>
      <PageHeader
        title="Reports overview"
        subtitle="Platform activity and hiring performance at a glance."
        actions={
          <div className="flex gap-2">
            <Select
              ariaLabel="Date range"
              value={range}
              onChange={setRange}
              options={RANGE_OPTIONS}
            />
            <Button variant="outline" className="h-10" icon={<Download size={14} />}>
              Export report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value="12,480" change="+8.2%" icon={Users} />
        <StatCard label="Employers" value="942" change="+4.1%" icon={Building2} />
        <StatCard label="Active jobs" value="1,864" change="+6.7%" icon={Briefcase} />
        <StatCard label="Applications" value="30,720" change="+12.3%" icon={FileText} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold">Most applied jobs</h2>
          <p className="mt-1 text-xs text-muted">Top roles by applications this period.</p>

          <ol className="mt-5 space-y-4">
            {topJobs.map((job, i) => (
              <li key={job.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 text-xs text-muted">{i + 1}</span>
                    <span className="font-medium">{job.title}</span>
                    <span className="text-muted"> · {job.company}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {job.applications.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${(job.applications / maxApplications) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold">Pending verifications</h2>
            <p className="mt-3 text-4xl font-semibold tracking-tight">{pendingCount}</p>
            <p className="mt-1 text-xs text-muted">Employers waiting for document review.</p>
            <Link
              to="/admin/verifications"
              className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand-600 text-[13px] font-medium text-white hover:bg-brand-700"
            >
              Review now
            </Link>
          </Card>

          <Card className="p-6">
            <h2 className="text-[15px] font-semibold">This month</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">New signups</dt>
                <dd className="font-medium">1,200</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Jobs published</dt>
                <dd className="font-medium">318</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Hires reported</dt>
                <dd className="font-medium">74</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </section>
  );
}
