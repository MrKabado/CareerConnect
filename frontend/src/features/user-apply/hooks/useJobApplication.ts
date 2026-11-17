import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { ApplicationStep } from "@/components/common/user/jobApplicationComponents";
import { applicationStore, type SubmittedApplicationDocument } from "@/features/applications/applicationData";
import { getCompanyProfileBySlug } from "@/features/companies/companyProfiles";
import { jobListings } from "@/features/jobs/jobListings";
import { ojtOpportunities } from "@/components/common/user/ojtOpportunityData";
import { onboardingStore } from "@/features/onboarding/store";
import { findPublishedEmployerListing } from "@/features/employer-listings/listings";
import type { ApplicationFileKind, ApplicationOpportunity } from "@/features/user-apply/types";
import { getApplicationDate, serializeApplicationDocument, validateFile } from "@/features/user-apply/utils";

export function useJobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const job = jobListings.find((listing) => listing.id === jobId);
  const employerListing = jobId ? findPublishedEmployerListing(jobId) : undefined;
  const employerCompany = employerListing
    ? getCompanyProfileBySlug(employerListing.companySlug)
    : undefined;
  const ojtOpportunity = ojtOpportunities.find((opportunity) => opportunity.id === jobId);

  const opportunity: ApplicationOpportunity | undefined = employerListing
    ? {
        id: employerListing.publicId,
        company: employerCompany?.name ?? employerListing.companySlug,
        initials: employerCompany?.initials ?? "?",
        title: employerListing.title,
        location: employerListing.location,
        category: employerListing.category,
        arrangement: employerListing.hiring.schedule,
        salary: employerListing.salary,
        track: "Job",
      }
    : job
      ? {
          ...job,
          track: "Job",
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
            track: "OJT",
          }
        : undefined;

  const returnPath = opportunity?.track === "OJT" ? "/ojt-search" : "/job-search";
  const ojtAnswers = onboardingStore.getSnapshot().answers;
  const existingApplication = jobId
    ? applicationStore.getSnapshot().find((application) => application.jobListingId === jobId)
    : undefined;
  const [step, setStep] = useState<ApplicationStep>(existingApplication ? 3 : 1);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(Boolean(existingApplication));
  const [resume, setResume] = useState<File | null>(() => onboardingStore.getSnapshot().answers.resumeFile);
  const [applicationLetter, setApplicationLetter] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<File | null>(() => onboardingStore.getSnapshot().answers.coverLetterFile);
  const [resumeError, setResumeError] = useState("");
  const [letterError, setLetterError] = useState("");
  const [coverLetterError, setCoverLetterError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileSelect(file: File, kind: ApplicationFileKind) {
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

    if (kind === "letter") {
      setLetterError(error);
      setApplicationLetter(error ? null : file);
      return;
    }

    setCoverLetterError(error);
    setCoverLetter(error ? null : file);
    onboardingStore.setAnswer("coverLetterFile", error ? null : file);
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

  async function submitApplication() {
    if (!jobId || !resume) {
      setSubmitError("Your resume is required to submit this application.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const documents = await Promise.all([
        serializeApplicationDocument("resume", "Resume", resume),
        ...(applicationLetter ? [serializeApplicationDocument("application-letter", "Application letter", applicationLetter)] : []),
        ...(coverLetter ? [serializeApplicationDocument("cover-letter", "Cover letter", coverLetter)] : []),
      ]);
      const added = applicationStore.addJobApplication({
        jobListingId: opportunity?.id ?? jobId,
        companyInitial: opportunity?.initials ?? "?",
        title: opportunity?.title ?? "",
        company: opportunity?.company ?? "",
        appliedAt: getApplicationDate(),
        status: "Applied",
        track: opportunity?.track ?? "Job",
        resumeFileName: resume.name,
        applicationLetterFileName: applicationLetter?.name,
        coverLetterFileName: coverLetter?.name,
        applicantName: ojtAnswers.name || "Applicant",
        applicantEmail: ojtAnswers.email,
        applicantLocation: ojtAnswers.preferredLocations[0] || "Not provided",
        applicantEducation: [ojtAnswers.course, ojtAnswers.school].filter(Boolean).join(" · ") || "Not provided",
        applicantExperience: ojtAnswers.experienceLevel || "Not provided",
        applicantSkills: ojtAnswers.skills,
        applicantSummary: "Applicant profile submitted with this application.",
        documents: documents as SubmittedApplicationDocument[],
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
        error instanceof Error ? error.message : "We could not save your application. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    navigate,
    opportunity,
    returnPath,
    step,
    setStep,
    resume,
    applicationLetter,
    coverLetter,
    resumeError,
    setResumeError,
    letterError,
    setLetterError,
    coverLetterError,
    setCoverLetterError,
    submitError,
    setSubmitError,
    isSubmitting,
    isAlreadySubmitted,
    handleFileSelect,
    reviewApplication,
    submitApplication,
    ojtAnswers,
  };
}
