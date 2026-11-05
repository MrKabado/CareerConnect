import { Link } from "react-router";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import {
  ApplicationStepIndicator,
} from "@/components/common/user/jobApplicationComponents";
import JobApplicationFormStep from "@/features/user-apply/components/JobApplicationFormStep";
import JobApplicationNotFound from "@/features/user-apply/components/JobApplicationNotFound";
import JobApplicationReviewStep from "@/features/user-apply/components/JobApplicationReviewStep";
import JobApplicationSuccessStep from "@/features/user-apply/components/JobApplicationSuccessStep";
import ApplicationLayout from "@/features/user-apply/components/ApplicationLayout";
import { useJobApplication } from "@/features/user-apply/hooks/useJobApplication";

export default function JobApplicationPageContent() {
  const {
    opportunity,
    returnPath,
    step,
    setStep,
    resume,
    applicationLetter,
    coverLetter,
    resumeError,
    letterError,
    coverLetterError,
    submitError,
    isSubmitting,
    isAlreadySubmitted,
    handleFileSelect,
    reviewApplication,
    submitApplication,
    navigate,
    ojtAnswers,
  } = useJobApplication();

  if (!opportunity) {
    return <JobApplicationNotFound returnPath={returnPath ?? "/job-search"} />;
  }

  return (
    <ApplicationLayout>
      <main className="mx-auto w-full max-w-284 flex-1 px-10 pt-8 pb-12 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-6">
        <Link
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#16878b] hover:text-[#086f73] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          to="/job-search"
        >
          <span aria-hidden="true">←</span>
          {opportunity.track === "OJT" ? " Back to OJT search" : " Back to job"}
        </Link>

        <header className="mt-5 text-center">
          <h1 className="text-[25px] font-bold tracking-[-0.7px] text-[#25383a] max-[680px]:text-[22px]">
            Apply to {opportunity.company}
          </h1>
          <p className="mt-1 text-[11px] text-[#829091]">
            {opportunity.location || "Location not specified"} · {opportunity.category || "OJT"} · {opportunity.arrangement || "Work setup not specified"}
          </p>
        </header>

        <ApplicationStepIndicator currentStep={step} track={opportunity.track} />

        <section
          aria-live="polite"
          className="mx-auto mt-6 w-full max-w-162.5 rounded-2xl border border-[#edf1f1] bg-white p-6 shadow-[0_8px_24px_rgba(34,66,65,0.07)] max-[680px]:p-4"
        >
          <ErrorBoundary>
            {step === 1 && (
              <JobApplicationFormStep
                coverLetterError={coverLetterError}
                coverLetterFileName={coverLetter?.name}
                letterError={letterError}
                onFileSelect={handleFileSelect}
                onReview={reviewApplication}
                applicationLetterFileName={applicationLetter?.name}
                resumeError={resumeError}
                resumeFileName={resume?.name}
                submitError={submitError}
                track={opportunity.track}
              />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {step === 2 && (
              <JobApplicationReviewStep
                applicationLetterName={applicationLetter?.name}
                coverLetterName={coverLetter?.name}
                isSubmitting={isSubmitting}
                ojtAnswers={ojtAnswers}
                onBack={() => setStep(1)}
                onSubmit={submitApplication}
                opportunity={opportunity}
                resumeName={resume?.name}
                submitError={submitError}
              />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {step === 3 && (
              <JobApplicationSuccessStep
                isAlreadySubmitted={isAlreadySubmitted}
                onViewApplications={() => navigate("/applications")}
                opportunity={opportunity}
                submitError={submitError}
              />
            )}
          </ErrorBoundary>
        </section>
      </main>
    </ApplicationLayout>
  );
}
