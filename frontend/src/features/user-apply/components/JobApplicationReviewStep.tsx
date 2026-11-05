import {
  ApplicationPrimaryButton,
  ApplicationReviewRow,
} from "@/components/common/user/jobApplicationComponents";
import type { ApplicationOpportunity } from "@/features/user-apply/types";

type JobApplicationReviewStepProps = {
  opportunity: ApplicationOpportunity;
  resumeName?: string;
  applicationLetterName?: string;
  coverLetterName?: string;
  ojtAnswers: {
    school?: string;
    course?: string;
    yearLevel?: string;
    requiredOjtHours?: number | string;
    requiresMoa?: boolean;
    preferredStartDate?: string;
    allowancePreference?: string;
  };
  submitError: string;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void | Promise<void>;
};

export default function JobApplicationReviewStep({
  opportunity,
  resumeName,
  applicationLetterName,
  coverLetterName,
  ojtAnswers,
  submitError,
  isSubmitting,
  onBack,
  onSubmit,
}: JobApplicationReviewStepProps) {
  return (
    <>
      <h2 className="text-[15px] font-bold text-[#2c3e40]">
        {opportunity.track === "OJT"
          ? "Review your OJT application"
          : "Review your application"}
      </h2>
      <p className="mt-1 text-[10px] text-[#839192]">
        {opportunity.track === "OJT"
          ? "Check your school requirements and documents before submitting."
          : "Make sure everything looks right before submitting."}
      </p>

      <div className="mt-4 space-y-3">
        <ApplicationReviewRow
          label="Position"
          value={`${opportunity.title} at ${opportunity.company}`}
        />
        {opportunity.track === "OJT" && (
          <>
            <ApplicationReviewRow label="School" value={ojtAnswers.school || "Not provided"} />
            <ApplicationReviewRow label="Course" value={ojtAnswers.course || "Not provided"} />
            <ApplicationReviewRow label="Year level" value={ojtAnswers.yearLevel || "Not provided"} />
            <ApplicationReviewRow
              label="Required OJT hours"
              value={ojtAnswers.requiredOjtHours ? `${ojtAnswers.requiredOjtHours} hours` : "Not provided"}
            />
            <ApplicationReviewRow
              label="School MOA requirement"
              value={ojtAnswers.requiresMoa ? "Required" : "Not required"}
            />
            <ApplicationReviewRow
              label="Preferred start date"
              value={ojtAnswers.preferredStartDate || "Not provided"}
            />
            <ApplicationReviewRow
              label="Allowance preference"
              value={ojtAnswers.allowancePreference || "Not provided"}
            />
          </>
        )}
        <ApplicationReviewRow label="Resume" value={resumeName ?? "Not included"} />
        <ApplicationReviewRow label="Application Letter" value={applicationLetterName ?? "Not included"} />
        <ApplicationReviewRow label="Cover Letter" value={coverLetterName ?? "Not included"} />
      </div>

      {submitError && <p className="mt-3 text-[10px] text-[#b34840]">{submitError}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="min-h-10 rounded-[9px] border border-[#e2eaea] bg-white px-4 text-[11px] font-semibold text-[#536769] hover:bg-[#f7faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <ApplicationPrimaryButton disabled={isSubmitting} onClick={() => void onSubmit()}>
          {isSubmitting ? "Submitting..." : "Submit application"}
        </ApplicationPrimaryButton>
      </div>
    </>
  );
}
