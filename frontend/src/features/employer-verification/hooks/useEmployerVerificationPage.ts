import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import {
  downloadBlob,
  employerVerificationFilesApi,
} from "@/features/employer-verification/backendApi";
import { validateEmployerVerificationFile } from "@/features/employer-verification/api";
import {
  verificationDocumentRequirements,
  type VerificationDocumentKind,
} from "@/features/employer-verification/types";
import { useEmployerVerificationDocuments } from "@/features/employer-verification/useEmployerVerificationDocuments";

export function useEmployerVerificationPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const employerId = user?.role === "employer" ? String(user.id) : null;
  const {
    documents,
    isLoading,
    error: loadError,
    refresh,
  } = useEmployerVerificationDocuments(token, employerId);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<VerificationDocumentKind | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorKind, setUploadErrorKind] = useState<VerificationDocumentKind | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !employerId) return;

    let active = true;
    employerVerificationFilesApi
      .status(token)
      .then((response) => {
        if (active) {
          setVerificationStatus(response.status);
          setRejectionReason(response.rejection_reason ?? response.rejection_note);
          setVerificationError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setVerificationError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load verification status.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [employerId, token, user]);

  async function handleFileChange(kind: VerificationDocumentKind, file?: File) {
    if (!file) return;
    if (verificationStatus === "pending" || verificationStatus === "verified") {
      setUploadErrorKind(kind);
      setUploadError("Documents cannot be changed while verification is pending or approved.");
      return;
    }
    if (!token || !employerId) {
      setUploadErrorKind(kind);
      setUploadError("Sign in with an employer account before uploading documents.");
      return;
    }

    const validationError = validateEmployerVerificationFile(file);
    if (validationError) {
      setUploadErrorKind(kind);
      setUploadError(validationError);
      return;
    }

    setUploading(kind);
    setUploadProgress(0);
    setUploadError(null);
    setUploadErrorKind(null);
    setSubmitError(null);
    try {
      await employerVerificationFilesApi.upload(
        token,
        employerId,
        kind,
        file,
        setUploadProgress,
      );
      await refresh();
      setVerificationStatus("incomplete");
    } catch (requestError) {
      setUploadErrorKind(kind);
      setUploadError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be uploaded.",
      );
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  }

  async function handleRemove(kind: VerificationDocumentKind) {
    if (verificationStatus === "pending" || verificationStatus === "verified") {
      setUploadErrorKind(kind);
      setUploadError("Documents cannot be changed while verification is pending or approved.");
      return;
    }
    const document = documents.find((item) => item.kind === kind);
    if (!document || !token) return;

    setRemoving(document.id);
    setUploadError(null);
    setUploadErrorKind(null);
    try {
      await employerVerificationFilesApi.remove(token, document.id);
      await refresh();
      setVerificationStatus("incomplete");
    } catch (requestError) {
      setUploadErrorKind(kind);
      setUploadError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be removed.",
      );
    } finally {
      setRemoving(null);
    }
  }

  async function handleDownload(documentId: string, fileName: string) {
    if (!token) {
      setUploadError("Sign in with an employer account to download verification documents.");
      return;
    }

    setUploadError(null);
    setUploadErrorKind(null);
    try {
      downloadBlob(await employerVerificationFilesApi.download(token, documentId), fileName);
    } catch (requestError) {
      setUploadError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be downloaded.",
      );
    }
  }

  async function handleSubmit() {
    if (verificationStatus === "pending" || verificationStatus === "verified") {
      setSubmitError(
        verificationStatus === "pending"
          ? "Your company verification is already pending approval."
          : "Your company is already verified.",
      );
      return;
    }
    if (!token || !employerId) {
      setSubmitError("Sign in with an employer account before submitting documents.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await employerVerificationFilesApi.submit(token);
      setVerificationStatus("pending");
      navigate("/", { replace: true });
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "Your documents could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const uploadedKinds = new Set(documents.map((document) => document.kind));
  const allDocumentsUploaded = verificationDocumentRequirements.every((item) =>
    uploadedKinds.has(item.kind),
  );
  const requiredDocumentsCount = verificationDocumentRequirements.filter((item) =>
    uploadedKinds.has(item.kind),
  ).length;

  return {
    employer: user?.role === "employer" ? user : null,
    documents,
    isLoading,
    loadError,
    verificationError,
    verificationStatus,
    rejectionReason,
    refreshDocuments: refresh,
    uploading,
    uploadProgress,
    uploadError,
    uploadErrorKind,
    submitError,
    submitting,
    removing,
    allDocumentsUploaded,
    requiredDocumentsCount,
    handleFileChange,
    handleRemove,
    handleDownload,
    handleSubmit,
  };
}
