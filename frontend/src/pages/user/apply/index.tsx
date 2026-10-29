import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import {
  ApplicationFileUpload,
  ApplicationPrimaryButton,
  ApplicationReviewRow,
  ApplicationStepIndicator,
  type ApplicationStep,
} from "@/components/common/user/jobApplicationComponents";
import { applicationStore } from "@/features/applications/applicationData";
import { jobListings } from "@/features/jobs/jobListings";
import { ojtOpportunities } from "@/components/common/user/ojtOpportunityData";
import { onboardingStore } from "@/features/onboarding/store";

const maximumFileSize = 10 * 1024 * 1024;
const allowedFileName = /\.(pdf|doc|docx)$/i;

function validateFile(file: File) {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const hasAllowedType = !file.type || allowedTypes.includes(file.type);

  if (!allowedFileName.test(file.name) || !hasAllowedType) {
    return "Choose a PDF, DOC, or DOCX file.";
  }
  if (file.size > maximumFileSize) {
    return "Files must be 10 MB or smaller.";
  }
  return "";
}

function getApplicationDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JobApplicationPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = jobListings.find((listing) => listing.id === jobId);
  const ojtOpportunity = ojtOpportunities.find(
    (opportunity) => opportunity.id === jobId,
  );
  const opportunity = job
    ? {
        ...job,
        track: "Job" as const,
      }
    : ojtOpportunity
      ? {
          id: ojtOpportunity.id,
          company: ojtOpportunity.company,
          initials: ojtOpportunity.initials,
          title: ojtOpportunity.title,
          location: ojtOpportunity.location,
          category: ojtOpportunity.trainingFields.join(", "),
          arrangement: ojtOpportunity.workSetup,
          salary: ojtOpportunity.allowance,
          track: "OJT" as const,
        }
      : undefined;
  const returnPath = opportunity?.track === "OJT" ? "/ojt-search" : "/job-search";
  const ojtAnswers = onboardingStore.getSnapshot().answers;
  const existingApplication = jobId
    ? applicationStore
        .getSnapshot()
        .find((application) => application.jobListingId === jobId)
    : undefined;
  const [step, setStep] = useState<ApplicationStep>(
    existingApplication ? 3 : 1,
  );
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(
    Boolean(existingApplication),
  );
  const [resume, setResume] = useState<File | null>(
    () => onboardingStore.getSnapshot().answers.resumeFile,
  );
  const [applicationLetter, setApplicationLetter] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [letterError, setLetterError] = useState("");
  const [submitError, setSubmitError] = useState("");

  if (!opportunity) {
    return (
      <ApplicationLayout>
        <div className="mx-auto flex min-h-[440px] max-w-[650px] flex-col items-center justify-center px-6 text-center">
          <h1 className="text-[23px] font-bold text-[#263a3c]">
            Job opportunity not found
          </h1>
          <p className="mt-2 text-[12px] text-[#7d8c8d]">
            This listing may have expired or is no longer available.
          </p>
          <Link
            className="mt-5 rounded-lg bg-[#078b98] px-4 py-2.5 text-[11px] font-semibold text-white"
            to={returnPath}
          >
            Back to opportunity search
          </Link>
        </div>
      </ApplicationLayout>
    );
  }

  const selectedOpportunity = opportunity;

  function handleFileSelect(file: File, kind: "resume" | "letter") {
    const error = validateFile(file);
    if (kind === "resume") {
      setResumeError(error);
      setResume(error ? null : file);
      if (!error) {
        onboardingStore.setAnswer("resumeFile", file);
        onboardingStore.setAnswer("resumeSkipped", false);
      }
      return;
    }

    setLetterError(error);
    setApplicationLetter(error ? null : file);
  }

  function reviewApplication() {
    if (!resume) {
      setResumeError("Please attach your resume to continue.");
      return;
    }
    if (letterError) return;
    setResumeError("");
    setSubmitError("");
    setStep(2);
  }

  function submitApplication() {
    if (!jobId || !resume) {
      setSubmitError("Your resume is required to submit this application.");
      setStep(1);
      return;
    }

    try {
      const added = applicationStore.addJobApplication({
        jobListingId: selectedOpportunity.id,
        companyInitial: selectedOpportunity.initials,
        title: selectedOpportunity.title,
        company: selectedOpportunity.company,
        appliedAt: getApplicationDate(),
        status: "Applied",
        track: selectedOpportunity.track,
        resumeFileName: resume.name,
        applicationLetterFileName: applicationLetter?.name,
      });

      if (!added) {
        setIsAlreadySubmitted(true);
        setSubmitError("You have already applied for this opportunity.");
        setStep(3);
        return;
      }

      setIsAlreadySubmitted(false);
      setSubmitError("");
      setStep(3);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not save your application. Please try again.",
      );
    }
  }

  return (
    <ApplicationLayout>
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 pt-8 pb-12 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-6">
        <Link
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#16878b] hover:text-[#086f73] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          to="/job-search"
        >
          <span aria-hidden="true">←</span>
          {selectedOpportunity.track === "OJT" ? " Back to OJT search" : " Back to job"}
        </Link>

        <header className="mt-5 text-center">
          <h1 className="text-[25px] font-bold tracking-[-0.7px] text-[#25383a] max-[680px]:text-[22px]">
            Apply to {selectedOpportunity.company}
          </h1>
          <p className="mt-1 text-[11px] text-[#829091]">
            {selectedOpportunity.location || "Location not specified"} · {selectedOpportunity.category || "OJT"} · {selectedOpportunity.arrangement || "Work setup not specified"}
          </p>
        </header>

        <ApplicationStepIndicator currentStep={step} track={selectedOpportunity.track} />

        <section
          aria-live="polite"
          className="mx-auto mt-6 w-full max-w-[650px] rounded-[16px] border border-[#edf1f1] bg-white p-6 shadow-[0_8px_24px_rgba(34,66,65,0.07)] max-[680px]:p-4"
        >
          {step === 1 && (
            <>
              <h2 className="text-[15px] font-bold text-[#2c3e40]">
                {selectedOpportunity.track === "OJT"
                  ? "Your OJT application"
                  : "Your application"}
              </h2>
              <p className="mt-1 text-[10px] text-[#839192]">
                {selectedOpportunity.track === "OJT"
                  ? "Attach your resume and optional application letter. Your school and training details will be included for review."
                  : "Add the documents you’d like to share with the hiring team."}
              </p>

              <div className="mt-4 space-y-4">
                <ApplicationFileUpload
                  error={resumeError}
                  fileName={resume?.name}
                  helperText="PDF, DOC, or DOCX up to 10 MB"
                  label="Resume"
                  onSelect={(file) => handleFileSelect(file, "resume")}
                  required
                />
                <ApplicationFileUpload
                  error={letterError}
                  fileName={applicationLetter?.name}
                  helperText="PDF, DOC, or DOCX up to 10 MB"
                  label="Application Letter"
                  onSelect={(file) => handleFileSelect(file, "letter")}
                />
              </div>

              {submitError && (
                <p className="mt-3 text-[10px] text-[#b34840]">{submitError}</p>
              )}
              <div className="mt-5 flex justify-end">
                <ApplicationPrimaryButton onClick={reviewApplication}>
                  Review application <span aria-hidden="true">→</span>
                </ApplicationPrimaryButton>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-[15px] font-bold text-[#2c3e40]">
                {selectedOpportunity.track === "OJT"
                  ? "Review your OJT application"
                  : "Review your application"}
              </h2>
              <p className="mt-1 text-[10px] text-[#839192]">
                {selectedOpportunity.track === "OJT"
                  ? "Check your school requirements and documents before submitting."
                  : "Make sure everything looks right before submitting."}
              </p>

              <div className="mt-4 space-y-3">
                <ApplicationReviewRow
                  label="Position"
                  value={`${selectedOpportunity.title} at ${selectedOpportunity.company}`}
                />
                {selectedOpportunity.track === "OJT" && (
                  <>
                    <ApplicationReviewRow
                      label="School"
                      value={ojtAnswers.school || "Not provided"}
                    />
                    <ApplicationReviewRow
                      label="Course"
                      value={ojtAnswers.course || "Not provided"}
                    />
                    <ApplicationReviewRow
                      label="Year level"
                      value={ojtAnswers.yearLevel || "Not provided"}
                    />
                    <ApplicationReviewRow
                      label="Required OJT hours"
                      value={ojtAnswers.requiredOjtHours
                        ? `${ojtAnswers.requiredOjtHours} hours`
                        : "Not provided"}
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
                <ApplicationReviewRow
                  label="Resume"
                  value={resume?.name ?? "Not included"}
                />
                <ApplicationReviewRow
                  label="Application Letter"
                  value={applicationLetter?.name ?? "Not included"}
                />
              </div>

              {submitError && (
                <p className="mt-3 text-[10px] text-[#b34840]">{submitError}</p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="min-h-10 rounded-[9px] border border-[#e2eaea] bg-white px-4 text-[11px] font-semibold text-[#536769] hover:bg-[#f7faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Back
                </button>
                <ApplicationPrimaryButton onClick={submitApplication}>
                  Submit application
                </ApplicationPrimaryButton>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="flex min-h-[245px] flex-col items-center justify-center text-center">
              <span className="grid size-[54px] place-items-center rounded-full bg-[#ddf6ee] text-[#28a477]">
                <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
                  <path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </span>
              <h2 className="mt-4 text-[18px] font-bold tracking-[-0.3px] text-[#293d3e]">
                {isAlreadySubmitted
                  ? "Application already submitted"
                  : selectedOpportunity.track === "OJT"
                    ? "OJT application submitted"
                    : "Application submitted"}
              </h2>
              <p className="mt-2 max-w-[390px] text-[11px] leading-5 text-[#7e8d8e]">
                {selectedOpportunity.track === "OJT"
                  ? `Your OJT application for ${selectedOpportunity.title} has been added to My Applications, where you can track its status.`
                  : `Your application for ${selectedOpportunity.title} has been sent to ${selectedOpportunity.company}. You can track its progress in My Applications.`}
              </p>
              {submitError && (
                <p className="mt-3 text-[10px] text-[#b34840]">{submitError}</p>
              )}
              <ApplicationPrimaryButton
                onClick={() => navigate("/applications")}
              >
                View my applications
              </ApplicationPrimaryButton>
            </div>
          )}
        </section>
      </main>
    </ApplicationLayout>
  );
}

function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
