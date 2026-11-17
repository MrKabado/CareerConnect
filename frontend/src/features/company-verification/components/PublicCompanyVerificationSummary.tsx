import { getCompanyProfileSlug } from "@/features/companies/companyProfiles";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useEmployerVerificationDocuments } from "@/features/employer-verification/useEmployerVerificationDocuments";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";

const publicDocumentRequirements = [
  { kind: "business_registration", label: "Proof of business existence" },
  { kind: "employer_id_primary", label: "Registering person's government ID" },
] as const;

export default function PublicCompanyVerificationSummary({
  companyName,
}: {
  companyName: string;
}) {
  const { employer } = useEmployerStatus();
  const verification = useCompanyVerification();
  const documents = useEmployerVerificationDocuments(employer?.id ?? "");
  const belongsToEmployer = Boolean(
    employer &&
      getCompanyProfileSlug(employer.companyName) === getCompanyProfileSlug(companyName),
  );

  if (!belongsToEmployer) return null;

  const reviewStage = verification.stages.find(
    (stage) => stage.id === "verification_review",
  );
  const reviewStatus = reviewStage?.status === "complete"
    ? "Approved"
    : reviewStage?.status === "submitted"
      ? "In review"
      : reviewStage?.status === "needs_changes"
        ? "Needs changes"
        : "Not yet reviewed";

  return (
    <section
      aria-label="Company verification details"
      className="rounded-[16px] border border-[#e2eeeb] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-bold text-[#2d4244]">Company verification</h2>
          <p className="mt-1 text-[9px] text-[#829091]">Review status: {reviewStatus}</p>
        </div>
        <span className="text-[12px] font-bold text-[#263a3c]">
          {verification.percent}%
        </span>
      </div>

      <div
        aria-label={`Company verification ${verification.percent}% complete`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={verification.percent}
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2f1]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[#0d8fa2] transition-[width]"
          style={{ width: `${verification.percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-[8px] text-[#829091]">
        Six-stage verification
      </p>

      <div className="mt-4 border-t border-[#edf1f0] pt-3">
        <h3 className="text-[10px] font-semibold text-[#526365]">Verified documents</h3>
        <ul className="mt-2 space-y-2">
          {publicDocumentRequirements.map((requirement) => {
            const isSubmitted = documents.some(
              (document) => document.kind === requirement.kind,
            );
            const status = reviewStatus === "Approved"
              ? "Verified"
              : isSubmitted
                ? "Submitted"
                : "Not submitted";
            return (
              <li
                className="flex items-center justify-between gap-2 text-[9px]"
                key={requirement.kind}
              >
                <span className="text-[#607173]">{requirement.label}</span>
                <span
                  className={
                    status === "Verified"
                      ? "shrink-0 font-semibold text-[#228578]"
                      : "shrink-0 text-[#829091]"
                  }
                >
                  {status}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[8px] leading-4 text-[#829091]">
          Verification status is public. Uploaded files and personal ID details remain private.
        </p>
      </div>
    </section>
  );
}