import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { getConversationForApplication, getEmployerMessagingActor } from "@/features/messaging/api";
import type { Conversation } from "@/features/messaging/types";
import { downloadEmployerApplicantResume } from "@/features/employer-applicants/api";
import { useApplicantStatus } from "@/features/employer-applicants/useApplicantStatus";
import type { ApplicantDocument } from "@/features/employer-applicants/types";
import { getApplicationId } from "@/features/employer-applicants/utils";

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

  async function handleContactApplicant() {
    if (!applicant || contactLoading) return;
    setContactError(null);
    setContactLoading(true);

    try {
      if (!messagingActor) {
        throw new Error("Sign in as an employer to contact this applicant.");
      }

      const applicationId = getApplicationId(applicant.id);
      const conversation = await getConversationForApplication(applicationId, messagingActor);

      if (conversation) {
        navigate(`/employer/messages/${encodeURIComponent(conversation.conversationId)}`);
      } else {
        setShowContactDialog(true);
      }
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

  async function handleDownloadDocument() {
    if (!applicant || documentLoading) return;
    if (!token) {
      setDocumentError("Sign in as an employer to download this resume.");
      return;
    }

    setDocumentError(null);
    setDocumentLoading(true);
    try {
      const file = await downloadEmployerApplicantResume(token, applicant.id);
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = applicant.documents[0]?.fileName ?? "applicant-resume";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      setDocumentError(requestError instanceof Error ? requestError.message : "Unable to download this resume.");
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
