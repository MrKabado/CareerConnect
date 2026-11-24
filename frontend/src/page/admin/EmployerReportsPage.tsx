import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Building2, ShieldAlert } from "lucide-react";
import { Button, Card, PageHeader, Select } from "@/components/common";
import { useAuth } from "@/features/auth/useAuth";
import {
  adminApi,
  type AdminEmployerReport,
} from "@/features/admin/backendApi";

const REASONS: Record<AdminEmployerReport["reason"], string> = {
  abusive_behavior: "Abusive behavior",
  unpaid_salary: "Unpaid salary",
  fraud_or_scam: "Fraud or scam",
  unsafe_workplace: "Unsafe workplace",
  other: "Other concern",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Needs review" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All reports" },
];

function formatReportDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function EmployerReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<AdminEmployerReport[]>([]);
  const [status, setStatus] = useState<"all" | AdminEmployerReport["status"]>("pending");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.employerReports(token, status, page);
      setReports(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load employer reports.");
    } finally {
      setIsLoading(false);
    }
  }, [page, status, token]);

  useEffect(() => {
    // The request updates state after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports();
  }, [loadReports]);

  async function review(
    report: AdminEmployerReport,
    nextStatus: "investigating" | "resolved" | "dismissed",
    decision?: "deactivate_employer" | "no_action",
  ) {
    if (!token) return;
    setSavingId(report.id);
    setError(null);
    try {
      await adminApi.reviewEmployerReport(token, report.id, {
        status: nextStatus,
        ...(decision ? { decision } : {}),
        ...(notes[report.id]?.trim() ? { admin_notes: notes[report.id].trim() } : {}),
      });
      await loadReports();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save the report review.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <PageHeader
        title="Employer reports"
        subtitle="Investigate applicant reports of employer misconduct and record the administrative decision."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{total.toLocaleString()} report{total === 1 ? "" : "s"}</p>
        <Select
          ariaLabel="Filter employer reports"
          onChange={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          value={status}
        />
      </div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <span>{error}</span>
          <button className="font-semibold underline" onClick={() => void loadReports()} type="button">Try again</button>
        </div>
      )}
      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted" role="status">Loading employer reports…</Card>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto text-emerald-600" size={22} />
          <p className="mt-2 text-sm font-semibold text-ink">No reports in this view</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isOpen = report.status === "pending" || report.status === "investigating";
            const isSaving = savingId === report.id;
            return (
              <Card className="p-5" key={report.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-ink">{report.company?.name ?? report.employer.name}</h2>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-amber-800">{report.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Report #{report.id} · submitted {formatReportDate(report.created_at)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[10px] font-medium text-muted">
                    <Building2 size={13} /> Employer account {report.employer.account_status}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,.55fr)]">
                  <div>
                    <p className="text-xs font-semibold text-ink">{REASONS[report.reason]}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{report.details}</p>
                    <p className="mt-3 text-[11px] text-muted">
                      Reported by {report.reporter.name} ({report.reporter.email})
                    </p>
                    {report.decision && (
                      <p className="mt-2 text-xs font-semibold text-ink">
                        Decision: {report.decision === "deactivate_employer" ? "Employer account deactivated" : "No further action"}
                      </p>
                    )}
                    {report.admin_notes && <p className="mt-2 text-xs leading-5 text-muted">Admin notes: {report.admin_notes}</p>}
                  </div>
                  {isOpen && (
                    <div className="space-y-3 rounded-xl border border-line bg-canvas/60 p-3">
                      <label className="block text-[11px] font-semibold text-ink">
                        Investigation notes
                        <textarea
                          className="mt-1.5 min-h-20 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-normal leading-5 text-ink"
                          maxLength={5000}
                          onChange={(event) => setNotes((previous) => ({ ...previous, [report.id]: event.target.value }))}
                          placeholder="Record evidence reviewed or your decision rationale."
                          value={notes[report.id] ?? report.admin_notes ?? ""}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {report.status === "pending" && (
                          <Button disabled={isSaving} onClick={() => void review(report, "investigating")}>
                            Start investigation
                          </Button>
                        )}
                        <Button disabled={isSaving} onClick={() => void review(report, "resolved", "no_action")} variant="outline">
                          Resolve — no action
                        </Button>
                        <Button
                          disabled={isSaving}
                          icon={<ShieldAlert size={14} />}
                          onClick={() => void review(report, "resolved", "deactivate_employer")}
                          variant="danger"
                        >
                          Deactivate employer
                        </Button>
                        <Button disabled={isSaving} onClick={() => void review(report, "dismissed")} variant="outline">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          <div className="flex items-center justify-between">
            <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="outline">Previous</Button>
            <span className="text-xs text-muted">Page {page} of {lastPage}</span>
            <Button disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} variant="outline">Next</Button>
          </div>
        </div>
      )}
    </section>
  );
}
