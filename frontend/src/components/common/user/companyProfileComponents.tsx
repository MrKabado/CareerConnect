import { useCallback, useState, type FormEvent } from "react";
import { Flag } from "lucide-react";
import { Link } from "react-router";
import Modal from "@/components/common/Modal";
import JobLocationMap from "@/components/features/jobsearch/JobLocationMap";
import { publicJobsApi } from "@/features/jobs/backendApi";
import { useAuth } from "@/features/auth/useAuth";
import type { CompanyProfile } from "@/features/companies/companyProfiles";
import { getHiringSetupRequirements } from "@/features/company-verification/stages";
import { getIdentityVerificationMessage } from "@/features/user-applications/identityVerification";
import { apiRequest } from "@/lib/axios";

function CompanyMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[82px] rounded-[15px] border border-white/80 bg-white/90 px-4 py-3 text-center shadow-[0_4px_12px_rgba(47,102,96,0.06)]">
      <p className="text-[17px] font-bold leading-tight text-[#263a3c]">{value}</p>
      <p className="mt-1 text-[9px] text-[#829091]">{label}</p>
    </div>
  );
}

export function CompanyProfileHeader() {
  return (
    <header className="h-[54px] border-b border-[#e9eeee] bg-white">
      <div className="mx-auto flex h-full w-full max-w-[1136px] items-center justify-between px-6 max-[680px]:px-4 min-[1184px]:px-0">
        <Link
          aria-label="CareerConnect home"
          className="inline-flex items-center gap-2 text-[13px] font-bold tracking-[-0.3px] text-[#263a3c] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          to="/"
        >
          <span className="grid size-7 place-items-center rounded-[8px] bg-[#078b98] text-[12px] font-bold text-white">
            C
          </span>
          <span>
            Career<span className="text-[#078b98]">Connect</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            className="text-[9px] font-semibold text-[#738385] hover:text-[#07878b] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            to="/"
          >
            Back to jobs
          </Link>
          <span className="grid size-7 place-items-center rounded-full bg-[#def3ef] text-[8px] font-bold text-[#267e7a]">
            JM
          </span>
        </div>
      </div>
    </header>
  );
}

export function CompanyHero({
  profile,
  companySlug,
}: {
  profile: CompanyProfile;
  companySlug?: string;
}) {
  const { user, token } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <section className="border-b border-[#e1efec] bg-[radial-gradient(ellipse_at_80%_10%,rgba(192,244,232,0.5),transparent_44%),linear-gradient(112deg,#eff9f7_0%,#e9f8f5_56%,#ddf5ef_100%)] px-6 py-7 max-[680px]:px-4 max-[680px]:py-5">
      <div className="mx-auto max-w-[1136px]">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            {profile.logoUrl ? (
              <img
                alt={`${profile.name} logo`}
                className="size-[58px] shrink-0 rounded-[17px] object-cover shadow-[0_6px_12px_rgba(7,139,152,0.2)]"
                src={profile.logoUrl}
              />
            ) : (
              <div className="grid size-[58px] shrink-0 place-items-center rounded-[17px] bg-[#078b98] text-[20px] font-bold text-white shadow-[0_6px_12px_rgba(7,139,152,0.2)]">
                {profile.initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#def4ee] px-2 py-1 text-[8px] font-semibold text-[#24877c]">
                    <span aria-hidden="true">✓</span> Verified employer
                  </span>
                )}
                {profile.recommended && (
                  <span className="rounded-full bg-[#fff1d9] px-2 py-1 text-[8px] font-semibold text-[#a87827]">
                    Top recommended
                  </span>
                )}
              </div>
              <h1 className="truncate text-[25px] font-bold tracking-[-0.65px] text-[#263a3c] max-[680px]:text-[21px]">
                {profile.name}
              </h1>
              <p className="mt-1 text-[10px] text-[#7b8b8d]">
                {profile.location} · {profile.industry}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CompanyMetric label="Open roles" value={String(profile.openRoles.length)} />
            <CompanyMetric label="Team members" value={profile.teamSize} />
            <CompanyMetric label="Employer rating" value={profile.rating} />
            {user?.role === "applicant" && token && companySlug && (
              <button
                aria-haspopup="dialog"
                className="group inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-rose-200 bg-white/85 px-3 py-2 text-left shadow-[0_4px_12px_rgba(127,29,29,0.06)] transition hover:border-rose-300 hover:bg-rose-50 hover:shadow-[0_6px_16px_rgba(127,29,29,0.1)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                onClick={() => setReportOpen(true)}
                type="button"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 transition group-hover:bg-white">
                  <Flag aria-hidden="true" className="size-4" />
                </span>
                <span>
                  <span className="block text-[10px] font-bold text-rose-800">Report employer</span>
                  <span className="mt-0.5 block text-[8px] text-[#879394]">Raise a concern</span>
                </span>
              </button>
            )}
          </div>
        </div>

        {profile.tagline ? (
          <p className="mt-4 max-w-[730px] text-[11px] leading-[1.65] text-[#657779]">
            {profile.tagline}
          </p>
        ) : null}
      </div>
      {reportOpen && companySlug && token && (
        <EmployerReportDialog
          companyName={profile.name}
          companySlug={companySlug}
          onClose={() => setReportOpen(false)}
          token={token}
        />
      )}
    </section>
  );
}

function EmployerReportDialog({
  companyName,
  companySlug,
  token,
  onClose,
}: {
  companyName: string;
  companySlug: string;
  token: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("abusive_behavior");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest(`/companies/${encodeURIComponent(companySlug)}/reports`, {
        method: "POST",
        data: { reason, details },
      }, token);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit your report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={submitted ? "Report submitted" : "Report employer"}
      subtitle={companyName}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      {submitted ? (
        <div className="space-y-4 px-6 pb-6">
          <p className="text-sm leading-6 text-[#526466]">
            Thank you. CareerConnect Admin will investigate this report and decide whether action is needed.
          </p>
          <button className="rounded-lg bg-[#078b98] px-4 py-2 text-sm font-semibold text-white" onClick={onClose} type="button">
            Done
          </button>
        </div>
      ) : (
        <form className="space-y-4 px-6 pb-6" onSubmit={(event) => void submitReport(event)}>
          <p className="text-sm leading-6 text-[#526466]">
            Report concerns such as abusive behavior, unpaid salaries, or suspected fraud. Provide factual details so Admin can investigate.
          </p>
          <label className="block text-xs font-semibold text-[#34494b]">
            Reason
            <select
              className="mt-1.5 h-11 w-full rounded-lg border border-[#d8e3e1] bg-white px-3 text-sm font-normal text-[#34494b]"
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            >
              <option value="abusive_behavior">Abusive behavior</option>
              <option value="unpaid_salary">Unpaid salary</option>
              <option value="fraud_or_scam">Fraud or scam</option>
              <option value="unsafe_workplace">Unsafe workplace</option>
              <option value="other">Other concern</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#34494b]">
            What happened?
            <textarea
              className="mt-1.5 min-h-32 w-full resize-y rounded-lg border border-[#d8e3e1] px-3 py-2 text-sm font-normal leading-6 text-[#34494b]"
              maxLength={5000}
              minLength={20}
              onChange={(event) => setDetails(event.target.value)}
              required
              value={details}
            />
            <span className="mt-1 block font-normal text-[#758687]">Include at least 20 characters. Do not include passwords or other sensitive information.</span>
          </label>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#edf1f1] pt-4">
            <button className="rounded-lg border border-[#d8e3e1] px-4 py-2 text-sm font-semibold text-[#526466]" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="rounded-lg bg-[#078b98] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function CompanyHighlights({ profile }: { profile: CompanyProfile }) {
  return (
    <aside className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">
        Why {profile.name} matches you
      </h2>
      <ul className="mt-3 space-y-3">
        {profile.highlights.map((highlight) => (
          <li
            className="flex items-start gap-2 text-[9px] leading-[1.5] text-[#728284]"
            key={highlight}
          >
            <span className="mt-px grid size-3.5 shrink-0 place-items-center rounded-full bg-[#e1f6f1] text-[8px] font-bold text-[#269a91]">
              ✓
            </span>
            {highlight}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function CompanyApplicationProcess({
  steps,
}: {
  steps: CompanyProfile["applicationProcess"];
}) {
  return (
    <aside className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">
        Application process
      </h2>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, index) => (
          <li
            className="flex items-center gap-2.5 text-[9px] text-[#728284]"
            key={step}
          >
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#e1f6f1] text-[8px] font-bold text-[#269a91]">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function CompanyBenefits({ profile }: { profile: CompanyProfile }) {
  if (!profile.benefits?.length) return null;

  return (
    <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">Benefits and workplace</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {profile.benefits.map((benefit) => (
          <li className="rounded-full bg-[#f0f6f5] px-2.5 py-1.5 text-[9px] font-medium text-[#607a7b]" key={benefit}>
            {benefit}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompanyLocations({ profile }: { profile: CompanyProfile }) {
  if (!profile.locations?.length) return null;

  return (
    <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">Hiring locations</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {profile.locations.map((location, index) => (
          <li className="rounded-xl bg-[#f7fbfa] p-3" key={`${location.city}-${index}`}>
            <p className="text-[10px] font-semibold text-[#344749]">{location.city}</p>
            <p className="mt-1 text-[9px] text-[#829091]">{location.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompanyContact({ profile }: { profile: CompanyProfile }) {
  const contactDetails = [
    { label: "Website", value: profile.website },
    { label: "Hiring email", value: profile.hiringEmail },
    { label: "Contact", value: profile.contactNumber },
    { label: "Founded", value: profile.founded },
  ].filter((detail) => detail.value);

  if (!contactDetails.length) return null;

  return (
    <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[12px] font-bold text-[#2d4244]">Company details</h2>
      <dl className="mt-3 space-y-2.5 text-[9px]">
        {contactDetails.map(({ label, value }) => (
          <div className="flex items-start justify-between gap-3" key={label}>
            <dt className="text-[#829091]">{label}</dt>
            <dd className="text-right font-medium text-[#526365]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CompanyHiringSetupDetails({
  profile,
  onEdit,
  editing = false,
  draft,
  onChange,
  onSave,
  onCancel,
  saveError,
}: {
  profile: CompanyProfile;
  onEdit?: () => void;
  editing?: boolean;
  draft?: {
    title: string;
    department: string;
    location: string;
    workspace: string;
    schoolPartnerships: string;
    acceptedCourses: string;
  };
  onChange?: (field: keyof NonNullable<typeof draft>, value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  saveError?: string | null;
}) {
  const setup = profile.hiringDefaults ?? {
    title: "",
    department: "",
    location: "",
    workspace: "",
    schoolPartnerships: "",
    acceptedCourses: "",
  };
  const requirements = getHiringSetupRequirements(profile);
  const completedRequirements = requirements.filter((requirement) => requirement.complete).length;

  const details = [
    { label: "Default role", value: setup.title },
    { label: "Department", value: setup.department },
    { label: "Location", value: setup.location },
    { label: "Work setup", value: setup.workspace },
    { label: "School partnerships", value: setup.schoolPartnerships },
    { label: "Accepted courses", value: setup.acceptedCourses },
  ].filter((detail) => detail.value.trim());

  const formFields = [
    { key: "title", label: "Default role" },
    { key: "department", label: "Department" },
    { key: "location", label: "Location" },
    { key: "workspace", label: "Work setup" },
    { key: "schoolPartnerships", label: "School partnerships" },
    { key: "acceptedCourses", label: "Accepted courses" },
  ] as const;

  return (
    <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-bold text-[#2d4244]">Hiring setup</h2>
        <span className="text-[9px] font-semibold text-[#718082]">
          {completedRequirements}/{requirements.length} complete
        </span>
        {!editing && onEdit ? (
          <button
            className="text-[10px] font-semibold text-[#087879] underline underline-offset-2"
            onClick={onEdit}
            type="button"
          >
            Edit
          </button>
        ) : null}
      </div>

      {editing && draft ? (
        <div className="mt-3 space-y-3 text-[9px]">
          {formFields.map(({ key, label }) => {
            const isTextarea = key === "schoolPartnerships";
            const fieldValue = draft[key] ?? "";

            return (
              <label className="flex items-start justify-between gap-3 text-[#829091]" key={key}>
                <span className="shrink-0 pt-2.5">{label}</span>
                {isTextarea ? (
                  <textarea
                    className="min-h-[52px] w-full max-w-[62%] resize-y rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                    onChange={(event) => onChange?.(key, event.currentTarget.value)}
                    value={fieldValue}
                  />
                ) : key === "workspace" ? (
                  <select
                    className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                    onChange={(event) => onChange?.(key, event.currentTarget.value)}
                    value={fieldValue}
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                ) : (
                  <input
                    className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                    onChange={(event) => onChange?.(key, event.currentTarget.value)}
                    value={fieldValue}
                  />
                )}
              </label>
            );
          })}

          {saveError ? <p className="text-[10px] text-[#a2534c]" role="alert">{saveError}</p> : null}
          <div className="mt-3 flex justify-end gap-2 border-t border-[#edf1f1] pt-3">
            <button
              className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[10px] font-semibold text-[#526365] hover:bg-white"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-[#0d8fa2] px-4 py-2 text-[10px] font-semibold text-white hover:bg-[#0b7a89]"
              onClick={onSave}
              type="button"
            >
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <>
          {details.length ? (
            <dl className="mt-3 space-y-2.5 text-[9px]">
              {details.map(({ label, value }) => (
                <div className="flex items-start justify-between gap-3" key={label}>
                  <dt className="shrink-0 text-[#829091]">{label}</dt>
                  <dd className="text-right font-medium text-[#526365]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-[10px] leading-4 text-[#718082]">
              Add your hiring defaults and company details to complete this stage.
            </p>
          )}
          <ul aria-label="Hiring setup requirements" className="mt-3 space-y-1.5 text-[9px]">
            {requirements.map(({ label, complete }) => (
              <li className={complete ? "text-[#228578]" : "text-[#718082]"} key={label}>
                <span aria-hidden="true" className="mr-1">{complete ? "✓" : "○"}</span>
                {label}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function CompanyOpenRoles({
  profile,
  isLoading = false,
  error = null,
  onRetry,
}: {
  profile: CompanyProfile;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<CompanyProfile["openRoles"][number] | null>(null);
  const selectedRoleId = selectedRole && /^\d+$/.test(selectedRole.id)
    ? Number(selectedRole.id)
    : null;
  const resolveCoordinates = useCallback(async () => {
    if (selectedRoleId == null) return null;
    const resolved = await publicJobsApi.show(selectedRoleId);
    return { latitude: resolved.latitude, longitude: resolved.longitude };
  }, [selectedRoleId]);

  return (
    <section
      aria-labelledby="company-open-roles"
      className="min-w-0 rounded-[16px] border border-[#e8eeee] bg-[#f9fcfb] p-4 md:sticky md:top-5 md:max-h-[calc(100vh-2.5rem)] md:overflow-y-auto"
    >
      <div className="mb-3">
        <h2
          className="text-[16px] font-bold tracking-[-0.25px] text-[#2d4244]"
          id="company-open-roles"
        >
          Open positions <span className="text-[#829091]">({profile.openRoles.length})</span>
        </h2>
        <p className="mt-1 text-[9px] text-[#839192]">
          Select a position to see its complete details.
        </p>
      </div>

      {isLoading ? (
        <p className="rounded-[15px] border border-[#e7eeee] bg-white p-4 text-[10px] text-[#748385]" role="status">
          Loading active opportunities…
        </p>
      ) : error ? (
        <div className="rounded-[15px] border border-[#f1d3d0] bg-white p-4 text-[10px] leading-5 text-[#8b332c]" role="alert">
          <p>Active opportunities could not be loaded: {error}</p>
          {onRetry && (
            <button
              className="mt-2 font-semibold underline underline-offset-2"
              onClick={onRetry}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      ) : profile.openRoles.length ? (
      <div className="space-y-2.5">
        {profile.openRoles.map((role) => (
          <article
            className="rounded-[12px] border border-[#e3ecea] bg-white p-3 shadow-[0_4px_14px_rgba(39,85,82,0.04)]"
            key={role.id}
          >
            <button
              aria-label={`View details for ${role.title}`}
              className="block w-full text-left focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              onClick={() => setSelectedRole(role)}
              type="button"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold text-[#2d4244]">{role.title}</span>
                  <span className="mt-1 block text-[9px] font-medium text-[#718184]">{role.category}</span>
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold ${
                  role.type === "OJT" ? "bg-[#fff0dc] text-[#bd852d]" : "bg-[#e4f5f2] text-[#28847f]"
                }`}>{role.type}</span>
              </span>
              <span className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[8px] text-[#839192]">
                <span>{role.location}</span>
                <span aria-hidden="true">·</span>
                <span>{role.arrangement}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#607779]">{role.salary}</span>
              </span>
              <span className="mt-2 block line-clamp-2 text-[9px] leading-4 text-[#748385]">
                {role.description}
              </span>
              <span className="mt-2 block text-[9px] font-semibold text-[#078b98]">
                View full details <span aria-hidden="true">→</span>
              </span>
            </button>
            {user?.role === "applicant" && user.identity_verification_status !== "verified" && (
              <p className="mt-2 text-[8px] leading-4 text-[#758687]">
                {getIdentityVerificationMessage(
                  user.identity_verification_status ?? "unverified",
                  user.identity_verification_rejection_reason,
                )}
              </p>
            )}
          </article>
        ))}
      </div>
      ) : (
        <p className="rounded-[15px] border border-[#e7eeee] bg-white p-4 text-[10px] leading-5 text-[#748385]">
          {profile.name} has no active job or OJT listings right now. Please check back later.
        </p>
      )}
      {selectedRole && (
        <Modal
          title={selectedRole.title || "Position details"}
          subtitle={`${profile.name} · ${selectedRole.category}`}
          onClose={() => setSelectedRole(null)}
          widthClass="max-w-3xl"
        >
          <div className="space-y-5 px-6 pb-6 max-[680px]:px-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <RoleDetail label="Position type" value={selectedRole.type} />
              <RoleDetail label="Employment type" value={selectedRole.employmentType?.replaceAll("_", " ")} />
              <RoleDetail label="Work arrangement" value={selectedRole.arrangement} />
              <RoleDetail label="Salary or allowance" value={selectedRole.salary} />
              <RoleDetail label="Location" value={selectedRole.location} />
              <RoleDetail label="Experience" value={
                selectedRole.experienceRequired
                  ? selectedRole.minimumExperienceYears != null
                    ? `${selectedRole.minimumExperienceYears} ${selectedRole.minimumExperienceYears === 1 ? "year" : "years"} required`
                    : "Experience required"
                  : selectedRole.experienceRequired === false ? "No experience required" : null
              } />
              <RoleDetail label="Applicant limit" value={selectedRole.applicantLimit} />
              <RoleDetail label="Posted" value={formatCompanyRoleDate(selectedRole.publishedAt)} />
              <RoleDetail label="Application deadline" value={formatCompanyRoleDate(selectedRole.expiresAt)} />
            </dl>
            {selectedRole.location && (
              <section>
                <h3 className="text-sm font-semibold text-[#263638]">Job location</h3>
                <div className="mt-3">
                  <JobLocationMap
                    latitude={selectedRole.latitude}
                    longitude={selectedRole.longitude}
                    address={selectedRole.streetAddress
                      ? `${selectedRole.streetAddress}, ${selectedRole.location}`
                      : selectedRole.location}
                    resolveCoordinates={selectedRoleId == null ? undefined : resolveCoordinates}
                  />
                </div>
              </section>
            )}
            <section>
              <h3 className="text-sm font-semibold text-[#263638]">Job description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5b7072]">{selectedRole.description || "No description provided."}</p>
            </section>
            {selectedRole.responsibilities?.length ? (
              <section>
                <h3 className="text-sm font-semibold text-[#263638]">Responsibilities</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#5b7072]">
                  {selectedRole.responsibilities.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ) : null}
            {selectedRole.requirementsText?.trim() ? (
              <section>
                <h3 className="text-sm font-semibold text-[#263638]">Qualifications and requirements</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5b7072]">{selectedRole.requirementsText}</p>
              </section>
            ) : null}
            {selectedRole.skills.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-[#263638]">Required skills</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRole.skills.map((skill) => (
                    <span className="rounded-full bg-[#eef7f6] px-3 py-1.5 text-xs font-medium text-[#397276]" key={skill}>{skill}</span>
                  ))}
                </div>
              </section>
            )}
            {selectedRole.schoolPartnerships && (
              <section>
                <h3 className="text-sm font-semibold text-[#263638]">Eligible courses</h3>
                <p className="mt-2 text-sm leading-6 text-[#5b7072]">{selectedRole.schoolPartnerships}</p>
              </section>
            )}
            {user?.role === "applicant" && user.identity_verification_status !== "verified" ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
                {getIdentityVerificationMessage(
                  user.identity_verification_status ?? "unverified",
                  user.identity_verification_rejection_reason,
                )}
              </p>
            ) : /^\d+$/.test(selectedRole.id) ? (
              <div className="flex justify-end border-t border-[#edf1f1] pt-4">
                <Link
                  className="rounded-lg bg-[#078b98] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#067983]"
                  to={`/apply/${selectedRole.id}`}
                >
                  Apply for this position
                </Link>
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </section>
  );
}

function RoleDetail({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  return (
    <div className="rounded-lg border border-[#e5eeeb] bg-[#f8fbfa] p-3">
      <dt className="text-xs font-medium capitalize text-[#718181]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold capitalize text-[#263638]">{value}</dd>
    </div>
  );
}

function formatCompanyRoleDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export function CompanyLifeAt({ profile }: { profile: CompanyProfile }) {
  return (
    <section className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
      <h2 className="text-[13px] font-bold text-[#2d4244]">
        Life at {profile.name}
      </h2>
      {profile.cultureSummary ? (
        <p className="mt-1 text-[9px] leading-[1.55] text-[#809091]">
          {profile.cultureSummary}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {profile.lifeAt.map((item, index) => (
          <article
            className="rounded-[12px] bg-[#f1f7f6] p-3"
            key={`${item.title}-${index}`}
          >
            <h3 className="text-[9px] font-bold text-[#34494b]">
              {item.title}
            </h3>
            <p className="mt-1 text-[8px] leading-[1.45] text-[#819091]">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
