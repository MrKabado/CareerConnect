import { useState } from "react";
import { useNavigate } from "react-router";
import { employerRegistrationApi } from "@/features/employer-registration/api";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import {
  submitEmployerVerificationDocuments,
  uploadEmployerVerificationDocument,
  validateEmployerVerificationFile,
} from "@/features/employer-verification/api";
import {
  verificationDocumentRequirements,
  type VerificationDocumentKind,
} from "@/features/employer-verification/types";
import { useEmployerVerificationDocuments } from "@/features/employer-verification/useEmployerVerificationDocuments";

export function useEmployerVerificationPage() {
  const { employer } = useEmployerStatus();
  const navigate = useNavigate();
  const employerId = employer?.id ?? "";
  const documents = useEmployerVerificationDocuments(employerId);
  const [uploading, setUploading] = useState<VerificationDocumentKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(kind: VerificationDocumentKind, file?: File) {
    if (!employer || !file) return;
    const validationError = validateEmployerVerificationFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(kind);
    setUploadError(null);
    setSubmitError(null);
    try {
      await uploadEmployerVerificationDocument(employer.id, kind, file);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The document could not be uploaded.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit() {
    if (!employer) {
      setSubmitError("No employer account is available for document submission.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitEmployerVerificationDocuments(employer.id);
      await employerRegistrationApi.setStatus("pending_review");
      navigate("/employer/under-review", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Your documents could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const uploadedKinds = new Set(documents.map((document) => document.kind));
  const allDocumentsUploaded = verificationDocumentRequirements.every((item) =>
    uploadedKinds.has(item.kind),
  );

  return {
    employer,
    documents,
    uploading,
    uploadError,
    submitError,
    submitting,
    allDocumentsUploaded,
    handleFileChange,
    handleSubmit,
  };
}
