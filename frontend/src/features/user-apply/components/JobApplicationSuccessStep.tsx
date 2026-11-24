import { ApplicationPrimaryButton } from "@/components/common/user/jobApplicationComponents";
import type { ApplicationOpportunity } from "@/features/user-apply/types";

type JobApplicationSuccessStepProps = {
  opportunity: ApplicationOpportunity;
  isAlreadySubmitted: boolean;
  submitError: string;
  onViewApplications: () => void;
};

export default function JobApplicationSuccessStep({
  opportunity,
  isAlreadySubmitted,
  submitError,
  onViewApplications,
}: JobApplicationSuccessStepProps) {
  return (
    <div className="flex min-h-61.25 flex-col items-center justify-center text-center">
      <span className="grid size-13.5 place-items-center rounded-full bg-[#ddf6ee] text-[#28a477]">
        <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
          <path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <h2 className="mt-4 text-[18px] font-bold tracking-[-0.3px] text-[#293d3e]">
        {isAlreadySubmitted
          ? "Application already submitted"
          : opportunity.track === "OJT"
            ? "OJT application submitted"
            : "Application submitted"}
      </h2>
      <p className="mt-2 max-w-97.5 text-[11px] leading-5 text-[#7e8d8e]">
        {opportunity.track === "OJT"
          ? `Your OJT application for ${opportunity.title} has been added to My Applications, where you can track its status.`
          : `Your application for ${opportunity.title} has been sent to ${opportunity.company}. You can track its progress in My Applications.`}
      </p>
      {submitError && <p className="mt-3 text-[10px] text-[#b34840]">{submitError}</p>}
      <ApplicationPrimaryButton onClick={onViewApplications}>
        View my applications
      </ApplicationPrimaryButton>
    </div>
  );
}
