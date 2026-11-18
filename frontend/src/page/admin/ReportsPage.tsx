import { useCallback, useEffect, useState } from "react";
import { Briefcase, Building2, Download, FileText, Users } from "lucide-react";
import { Link } from "react-router";
import StatCard from "../../components/admin/StatCard";
import { Button, Card, PageHeader } from "../../components/common";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi, type AdminDashboardStats } from "@/features/admin/backendApi";
import { downloadCsv } from "../../utils/csv";

const emptyStats: AdminDashboardStats = {
  total_applicants: 0,
  total_employers: 0,
  pending_verifications: { total: 0, applicants: 0, employers: 0 },
  total_job_listings: 0,
  active_job_listings: 0,
  total_applications: 0,
};

export default function ReportsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await adminApi.dashboard(token);
      setStats(response.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load platform statistics.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const reportStats = [
    ["Applicants", stats.total_applicants],
    ["Employers", stats.total_employers],
    ["Job listings", stats.total_job_listings],
    ["Active job listings", stats.active_job_listings],
    ["Applications", stats.total_applications],
    ["Pending verifications", stats.pending_verifications.total],
  ] as const;

  function exportReport() {
    downloadCsv("careerconnect-live-report.csv", [
      ["Metric", "Current total"],
      ...reportStats.map(([label, value]) => [label, String(value)]),
      ["Pending applicant verifications", String(stats.pending_verifications.applicants)],
      ["Pending employer verifications", String(stats.pending_verifications.employers)],
    ]);
  }

  return (
    <section>
      <PageHeader
        title="Reports overview"
        subtitle="Live totals from the CareerConnect database."
        actions={
          <Button variant="outline" className="h-10" icon={<Download size={14} />} onClick={exportReport} disabled={isLoading || Boolean(error)}>
            Export report
          </Button>
        }
      />

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <span>{error}</span><button className="font-semibold underline" onClick={() => { setIsLoading(true); setError(null); void load(); }} type="button">Try again</button>
        </div>
      )}
      <div aria-busy={isLoading} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Applicants" value={isLoading ? "—" : stats.total_applicants.toLocaleString()} icon={Users} />
        <StatCard label="Employers" value={isLoading ? "—" : stats.total_employers.toLocaleString()} icon={Building2} />
        <StatCard label="Job listings" value={isLoading ? "—" : stats.total_job_listings.toLocaleString()} icon={Briefcase} />
        <StatCard label="Active listings" value={isLoading ? "—" : stats.active_job_listings.toLocaleString()} icon={Briefcase} />
        <StatCard label="Applications" value={isLoading ? "—" : stats.total_applications.toLocaleString()} icon={FileText} />
        <StatCard label="Pending verifications" value={isLoading ? "—" : stats.pending_verifications.total.toLocaleString()} icon={Users} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold">Pending review</h2>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted">Applicant verifications</dt><dd className="font-medium">{isLoading ? "—" : stats.pending_verifications.applicants}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Employer verifications</dt><dd className="font-medium">{isLoading ? "—" : stats.pending_verifications.employers}</dd></div>
          </dl>
          <Link to="/admin/verifications" className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand-600 text-[13px] font-medium text-white hover:bg-brand-700">
            Review employer requests
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold">Database totals</h2>
          <p className="mt-3 text-xs leading-5 text-muted">
            These values come from the admin dashboard API. Month-over-month growth and most-applied listing analytics are not exposed by the current API.
          </p>
        </Card>
      </div>
    </section>
  );
}
