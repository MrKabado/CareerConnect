import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { ApplicationStep } from "@/components/common/user/jobApplicationComponents";
import { useAuth } from "@/features/auth/useAuth";
import { applicantFilesApi, type ApplicantResumeFile } from "@/features/user-profile/backendApi";
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
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resume, setResume] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState<ApplicationStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

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

  function reviewApplication() {
    if (!resume && !savedResume) {
      setResumeError("Upload a resume before continuing.");
      return;
    }
    if (resumeLoading) return;
    setResumeError("");
    setSubmitError("");
    setStep(2);
  }

  async function submitApplication() {
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
      await applicantApplicationsApi.submit(token, listingId, coverLetter);
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
      ? "This sample opportunity is not connected to a live listing."
      : listingError,
    step,
    setStep,
    resume,
    savedResumeName: savedResume?.original_filename,
    resumeLoading: Boolean(token) && resumeLoading,
    coverLetter,
    setCoverLetter,
    resumeError,
    submitError,
    isSubmitting,
    uploadProgress,
    isAlreadySubmitted,
    handleFileSelect,
    reviewApplication,
    submitApplication,
  };
}
