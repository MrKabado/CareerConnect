import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { getEmployerMessagingActor } from "@/features/messaging/api";
import type { Conversation } from "@/features/messaging/types";
import {
  downloadEmployerApplicantCoverLetter,
  downloadEmployerApplicantResume,
  getEmployerApplicantResumeUrls,
} from "@/features/employer-applicants/api";
import { useApplicantStatus } from "@/features/employer-applicants/useApplicantStatus";
import type { ApplicantDocument } from "@/features/employer-applicants/types";
import { getExternalDocumentUrl } from "@/features/employer-applicants/utils";

export function useApplicantDetail() {
  const { applicantId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const applicantStage = useApplicantStatus(applicantId ?? "");
  const [selectedDocument, setSelectedDocument] = useState<ApplicantDocument | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<ApplicantDocument | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const applicant = applicantStage.applicant;
  const status = applicantStage.status;
  const messagingActor = getEmployerMessagingActor(user);

  useEffect(() => {
    if (
      !applicant ||
      !selectedDocument ||
      selectedDocument.dataUrl ||
      getExternalDocumentUrl(selectedDocument)
    ) {
      return;
    }

    if (!token) return;

    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setDocumentError(null);
      setDocumentLoading(true);
      try {
        if (selectedDocument.title === "Resume") {
          const urls = await getEmployerApplicantResumeUrls(token, applicant.id);
          if (!active) return;
          if (urls) {
            const isPdf = selectedDocument.mimeType === "application/pdf"
              || /\.pdf$/i.test(selectedDocument.fileName);
            if (isPdf) {
              setSelectedDocument((current) =>
                current?.id === selectedDocument.id
                  ? { ...current, dataUrl: urls.previewUrl }
                  : current,
              );
              return;
            }
          }
        }

        const file = selectedDocument.title.toLowerCase().includes("cover letter")
          ? await downloadEmployerApplicantCoverLetter(token, applicant.id)
          : await downloadEmployerApplicantResume(token, applicant.id);
        if (!active) return;
        const dataUrl = URL.createObjectURL(file);
        setSelectedDocument((current) =>
          current?.id === selectedDocument.id
            ? {
                ...current,
                dataUrl,
                blob: file,
                mimeType: file.type || current.mimeType,
              }
            : current,
        );
      } catch (requestError: unknown) {
        if (active) {
          setDocumentError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to preview this resume.",
          );
        }
      } finally {
        if (active) setDocumentLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [applicant, selectedDocument, token]);

  useEffect(() => {
    const dataUrl = selectedDocument?.dataUrl;
    if (!dataUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(dataUrl);
  }, [selectedDocument?.dataUrl]);

  async function handleContactApplicant() {
    if (!applicant || contactLoading) return;
    setContactError(null);
    setContactLoading(true);

    try {
      if (!messagingActor) {
        throw new Error("Sign in as an employer to contact this applicant.");
      }

      setShowContactDialog(true);
    } catch (caught) {
      setContactError(
        caught instanceof Error ? caught.message : "Could not open messaging for this applicant.",
      );
    } finally {
      setContactLoading(false);
    }
  }

  function handleConversationStarted(conversation: Conversation) {
    setShowContactDialog(false);
    navigate(`/employer/messages/${encodeURIComponent(conversation.conversationId)}`);
  }

  async function handleDownloadDocument(selectedDocument: ApplicantDocument) {
    if (!applicant || documentLoading) return;
    if (!token) {
      setDocumentError("Sign in as an employer to download this document.");
      return;
    }

    setDocumentError(null);
    setDocumentLoading(true);
    try {
      let file: Blob;
      if (selectedDocument.title === "Resume") {
        const urls = await getEmployerApplicantResumeUrls(token, applicant.id);
        if (urls) {
          const link = window.document.createElement("a");
          link.href = urls.downloadUrl;
          link.download = selectedDocument.fileName;
          window.document.body.append(link);
          link.click();
          link.remove();
          return;
        }
        file = await downloadEmployerApplicantResume(token, applicant.id);
      } else {
        file = await downloadEmployerApplicantCoverLetter(token, applicant.id);
      }
      const objectUrl = URL.createObjectURL(file);
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = selectedDocument.fileName;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      setDocumentError(requestError instanceof Error ? requestError.message : "Unable to download this document.");
    } finally {
      setDocumentLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedDocument) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedDocument(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedDocument]);

  return {
    applicant,
    applicantStage,
    status,
    isLoading: applicantStage.isLoading,
    selectedDocument,
    setSelectedDocument,
    selectedPortfolio,
    setSelectedPortfolio,
    showContactDialog,
    setShowContactDialog,
    contactLoading,
    contactError,
    messagingActor,
    handleContactApplicant,
    handleConversationStarted,
    documentLoading,
    documentError,
    handleDownloadDocument,
  };
}
