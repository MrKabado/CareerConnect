import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { getConversationForApplication, getEmployerMessagingActor } from "@/features/messaging/api";
import type { Conversation } from "@/features/messaging/types";
import { useApplicantStatus } from "@/features/employer-applicants/useApplicantStatus";
import { useEmployerApplicants } from "@/features/employer-applicants/useEmployerApplicants";
import type { ApplicantDocument } from "@/features/employer-applicants/types";
import { getApplicationId } from "@/features/employer-applicants/utils";

export function useApplicantDetail() {
  const { applicantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applicants, isLoading } = useEmployerApplicants();
  const applicantStage = useApplicantStatus(applicantId ?? "");
  const [selectedDocument, setSelectedDocument] = useState<ApplicantDocument | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<ApplicantDocument | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const applicant = applicants.find((candidate) => candidate.id === applicantId);
  const status = applicantStage.status ?? applicant?.status;
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
    isLoading,
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
  };
}
