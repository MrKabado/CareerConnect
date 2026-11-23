import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { ApplicationStep } from "@/components/common/user/jobApplicationComponents";
import { useAuth } from "@/features/auth/useAuth";
import {
  applicantFilesApi,
  type ApplicantDocumentType,
  type ApplicantResumeFile,
  type ApplicantStoredDocument,
} from "@/features/user-profile/backendApi";
import {
  formatListingPay,
  publicJobsApi,
  type PublicJobListing,
} from "@/features/jobs/backendApi";
import { applicantApplicationsApi } from "@/features/user-applications/backendApi";
import type { ApplicationOpportunity } from "@/features/user-apply/types";
import { validateFile } from "@/features/user-apply/utils";
import { ApiError } from "@/lib/axios";

function toOpportunity(listing: PublicJobListing): ApplicationOpportunity {
  const company = listing.company?.name ?? "Company unavailable";
  return {
    id: String(listing.id),
    company,
    initials: company.slice(0, 1).toUpperCase(),
    title: listing.title,
    location: listing.location,
    category: listing.category?.name ?? "Uncategorized",
    arrangement: listing.work_setup === "onsite"
      ? "On-site"
      : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
    salary: formatListingPay(listing),
    track: listing.listing_type === "ojt" ? "OJT" : "Job",
    experienceRequirement: listing.listing_type !== "job"
      ? "Not applicable"
      : listing.experience_required
        ? `At least ${listing.minimum_experience_years ?? 1} years`
        : "No experience required",
    requiredSkills: listing.required_skills ?? [],
  };
}

export function useJobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const listingId = /^\d+$/.test(jobId ?? "") ? Number(jobId) : null;
  const [listing, setListing] = useState<PublicJobListing | null>(null);
  const [listingLoading, setListingLoading] = useState(true);
  const [listingError, setListingError] = useState<string | null>(null);
  const [savedResume, setSavedResume] = useState<ApplicantResumeFile | null>(null);
  const [savedCoverLetter, setSavedCoverLetter] = useState<ApplicantStoredDocument | null>(null);
  const [isCoverLetterIncluded, setIsCoverLetterIncluded] = useState(true);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterUploadProgress, setCoverLetterUploadProgress] = useState<number | null>(null);
  const [coverLetterError, setCoverLetterError] = useState("");
  const [coverLetterDocumentsLoading, setCoverLetterDocumentsLoading] = useState(Boolean(token));
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState<ApplicationStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{
    token: string;
    canApply: boolean | null;
    reason: string | null;
    error: string | null;
  } | null>(null);
  const currentEligibilityResult = eligibilityResult?.token === token ? eligibilityResult : null;
  const canApply = currentEligibilityResult?.canApply ?? null;
  const applicationEligibilityError = currentEligibilityResult?.error
    ?? currentEligibilityResult?.reason
    ?? null;
  const applicationEligibilityLoading = Boolean(token && !currentEligibilityResult);

  useEffect(() => {
    let active = true;
    if (!token) return;
    void applicantApplicationsApi.eligibility(token)
      .then((response) => {
        if (active) {
          setEligibilityResult({
            token,
            canApply: response.can_apply,
            reason: response.reason,
            error: null,
          });
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setEligibilityResult({
            token,
            canApply: null,
            reason: null,
            error: requestError instanceof Error
              ? requestError.message
              : "Unable to verify your application eligibility.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    if (listingId === null) return;
    publicJobsApi.show(listingId)
      .then((result) => {
        if (active) {
          setListingError(null);
          setListing(result);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setListingError(requestError instanceof Error ? requestError.message : "Unable to load this listing.");
        setListing(null);
      })
      .finally(() => {
        if (active) setListingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    let active = true;
    if (!token) return;
    applicantFilesApi.resume(token)
      .then((result) => {
        if (active) {
          setSubmitError("");
          setSavedResume(result);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setSubmitError(requestError instanceof Error ? requestError.message : "Unable to check your saved resume.");
        }
      })
      .finally(() => {
        if (active) setResumeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    if (!token) return;
    applicantFilesApi.documents(token)
      .then((documents) => {
        if (!active) return;
        const coverLetter = documents.find((document) => document.document_type === "cover_letter") ?? null;
        setSavedCoverLetter(coverLetter);
        setIsCoverLetterIncluded(Boolean(coverLetter));
        setCoverLetterError("");
      })
      .catch((requestError: unknown) => {
        if (active) {
          setCoverLetterError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your saved cover letter.",
          );
        }
      })
      .finally(() => {
        if (active) setCoverLetterDocumentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const opportunity = useMemo(
    () => listingId !== null && listing ? toOpportunity(listing) : undefined,
    [listing, listingId],
  );
  const returnPath = opportunity?.track === "OJT" ? "/ojt-search" : "/job-search";

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    setResumeError(error);
    setResume(error ? null : file);
    setSubmitError("");
  }, []);

  const handleCoverLetterSelect = useCallback(async (file: File) => {
    setCoverLetterError("");
    if (!/\.pdf$|\.docx$/i.test(file.name)) {
      setCoverLetterError("Choose a PDF or DOCX cover letter.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverLetterError("Your cover letter must be 5 MB or smaller.");
      return;
    }
    if (!token) {
      setCoverLetterError("Sign in again before uploading a cover letter.");
      return;
    }

    setCoverLetterLoading(true);
    setCoverLetterUploadProgress(0);
    try {
      const document = await applicantFilesApi.uploadDocument(
        token,
        "cover_letter" satisfies ApplicantDocumentType,
        file,
        setCoverLetterUploadProgress,
      );
      setSavedCoverLetter(document);
      setIsCoverLetterIncluded(true);
    } catch (requestError) {
      setCoverLetterError(
        requestError instanceof Error
          ? requestError.message
          : "The cover letter could not be uploaded.",
      );
    } finally {
      setCoverLetterLoading(false);
      setCoverLetterUploadProgress(null);
    }
  }, [token]);

  function reviewApplication() {
    if (canApply === false) {
      setSubmitError(applicationEligibilityError ?? "You have been marked as hired and cannot submit new applications.");
      return;
    }
    if (canApply === null) {
      setSubmitError(applicationEligibilityError ?? "Unable to verify your application eligibility. Please try again.");
      return;
    }
    if (!resume && !savedResume) {
      setResumeError("Upload a resume before continuing.");
      return;
    }
    if (resumeLoading || coverLetterDocumentsLoading) return;
    setResumeError("");
    setSubmitError("");
    setStep(2);
  }

  async function submitApplication() {
    if (canApply === false) {
      setSubmitError(applicationEligibilityError ?? "You have been marked as hired and cannot submit new applications.");
      return;
    }
    if (canApply === null) {
      setSubmitError(applicationEligibilityError ?? "Unable to verify your application eligibility. Please try again.");
      return;
    }
    if (listingId === null || !token || (!resume && !savedResume)) {
      setSubmitError("A live listing, signed-in applicant account, and resume are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (resume) {
        const uploaded = await applicantFilesApi.uploadResume(token, resume, setUploadProgress);
        setSavedResume(uploaded);
      }
      await applicantApplicationsApi.submit(
        token,
        listingId,
        isCoverLetterIncluded ? savedCoverLetter?.id : undefined,
      );
      setIsAlreadySubmitted(false);
      setStep(3);
    } catch (requestError) {
      if (
        requestError instanceof ApiError &&
        requestError.status === 409 &&
        requestError.code === "already_applied"
      ) {
        setIsAlreadySubmitted(true);
        setStep(3);
      } else {
        setSubmitError(requestError instanceof Error ? requestError.message : "Unable to submit your application.");
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  }

  return {
    navigate,
    opportunity,
    returnPath,
    listingLoading: listingId !== null && listingLoading,
    listingError: listingId === null
      ? "This opportunity is not connected to a live listing."
      : listingError,
    step,
    setStep,
    resume,
    savedResumeName: savedResume?.original_filename,
    savedCoverLetterName: savedCoverLetter?.original_filename,
    coverLetterLoading,
    coverLetterUploadProgress,
    coverLetterError,
    coverLetterDocumentsLoading,
    isCoverLetterIncluded,
    setIsCoverLetterIncluded,
    resumeLoading: Boolean(token) && resumeLoading,
    resumeError,
    submitError,
    isSubmitting,
    uploadProgress,
    isAlreadySubmitted,
    canApply,
    applicationEligibilityError,
    applicationEligibilityLoading,
    handleFileSelect,
    handleCoverLetterSelect,
    reviewApplication,
    submitApplication,
  };
}
