import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import StatCard from "../../components/admin/StatCard";
import { Button, Card, PageHeader } from "../../components/common";
import { useAuth } from "@/features/auth/useAuth";
import {
  adminApi,
  type AdminActivityRecord,
  type AdminDashboardStats,
} from "@/features/admin/backendApi";
import { downloadCsv } from "../../utils/csv";

const emptyStats: AdminDashboardStats = {
  total_applicants: 0,
  total_employers: 0,
  pending_verifications: { total: 0, applicants: 0, employers: 0 },
  total_job_listings: 0,
  active_job_listings: 0,
  total_applications: 0,
};

function formatActivityTime(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function activityIcon(action: string) {
  if (action.includes("verification")) return ShieldCheck;
  if (action.includes("application")) return FileText;
  if (action.includes("listing")) return Briefcase;
  if (action.includes("registered")) return Users;
  if (action.includes("status")) return AlertTriangle;
  return Activity;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<AdminActivityRecord[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [response, activityResponse] = await Promise.all([
        adminApi.dashboard(token),
        adminApi.activity(token),
      ]);
      setStats(response.data);
      setActivities(activityResponse.data);
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
        <StatCard tone="blue" label="Applicants" value={isLoading ? "—" : stats.total_applicants.toLocaleString()} icon={Users} />
        <StatCard tone="teal" label="Employers" value={isLoading ? "—" : stats.total_employers.toLocaleString()} icon={Building2} />
        <StatCard tone="green" label="Job listings" value={isLoading ? "—" : stats.total_job_listings.toLocaleString()} icon={Briefcase} />
        <StatCard tone="blue" label="Active listings" value={isLoading ? "—" : stats.active_job_listings.toLocaleString()} icon={Briefcase} />
        <StatCard tone="amber" label="Applications" value={isLoading ? "—" : stats.total_applications.toLocaleString()} icon={FileText} />
        <StatCard tone="red" label="Pending verifications" value={isLoading ? "—" : stats.pending_verifications.total.toLocaleString()} icon={Users} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Recent activity</h2>
              <p className="mt-1 text-xs text-muted">Latest platform and administrator events</p>
            </div>
            <Activity size={17} className="text-brand-700" />
          </div>
          {isLoading ? (
            <p className="px-5 py-8 text-center text-xs text-muted">Loading recent activity…</p>
          ) : activities.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 size={22} className="mx-auto text-emerald-600" />
              <p className="mt-2 text-sm font-semibold text-ink">No recent activity</p>
              <p className="mt-1 text-xs text-muted">New platform events will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {activities.map((activity) => {
                const Icon = activityIcon(activity.action);
                return (
                  <li key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">{activity.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {activity.description}
                        {activity.actor_name ? ` · ${activity.actor_name}` : ""}
                      </p>
                    </div>
                    <time className="shrink-0 text-[10px] text-muted">{formatActivityTime(activity.created_at)}</time>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Quick actions</h2>
                <p className="mt-1 text-xs text-muted">Frequent admin tasks</p>
              </div>
              <ArrowRight size={16} className="text-brand-700" />
            </div>
            <div className="mt-4 grid gap-2">
              <Link to="/admin/verifications" className="flex h-10 items-center justify-between rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:border-brand-100 hover:bg-brand-50">
                <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-brand-700" />Review verifications</span>
                {stats.pending_verifications.total > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{stats.pending_verifications.total}</span>}
              </Link>
              <Link to="/admin/users" className="flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:border-blue-100 hover:bg-blue-50">
                <Users size={15} className="text-blue-700" />Manage users
              </Link>
              <Link to="/admin/categories" className="flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:border-emerald-100 hover:bg-emerald-50">
                <Briefcase size={15} className="text-emerald-700" />Manage categories
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Needs attention</h2>
                <p className="mt-1 text-xs text-muted">Items requiring review</p>
              </div>
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            {stats.pending_verifications.total > 0 ? (
              <Link to="/admin/verifications" className="mt-4 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-amber-700"><ShieldCheck size={15} /></span>
                <span>
                  <span className="block text-xs font-semibold text-ink">{stats.pending_verifications.total} pending verification{stats.pending_verifications.total === 1 ? "" : "s"}</span>
                  <span className="mt-1 block text-[11px] text-muted">Review employer and applicant submissions.</span>
                </span>
              </Link>
            ) : (
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-xs font-semibold text-emerald-800">Everything is up to date.</p>
                <p className="mt-1 text-[11px] text-muted">No supported review items are pending.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
