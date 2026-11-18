import { Link } from "react-router";
import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import ApplicantStageStepper from "@/features/employer-applicants/components/ApplicantStageStepper";
import { ApplicantDetailHeader } from "@/features/employer-applicants/components/ApplicantDetailHeader";
import {
  ApplicantDocumentPreviewDialog,
  ApplicantLoadingState,
  ApplicantNotFoundState,
  ApplicantProfileSection,
  ApplicantSidebar,
} from "@/features/employer-applicants/components/ApplicantDetailProfile";
import { useApplicantDetail } from "@/features/employer-applicants/hooks/useApplicantDetail";
import type { ApplicantDocument } from "@/features/employer-applicants/types";
import { getApplicationId, getExternalDocumentUrl } from "@/features/employer-applicants/utils";
import ContactApplicantDialog from "@/features/messaging/components/ContactApplicantDialog";

export default function ApplicantDetailPageContent() {
  const {
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
    documentLoading,
    documentError,
    handleDownloadDocument,
  } = useApplicantDetail();

  function openDocument(document: ApplicantDocument) {
    if (getExternalDocumentUrl(document) !== null) {
      setSelectedDocument(null);
      setSelectedPortfolio(document);
    } else {
      setSelectedPortfolio(null);
      setSelectedDocument(document);
    }
  }

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-280 flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4">
        <Link
          to="/employer/applicants"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#177d83] hover:text-[#0d626b]"
        >
          <span aria-hidden="true">←</span> Applicants
        </Link>

        {isLoading ? (
          <ApplicantLoadingState />
        ) : !applicant ? (
          applicantStage.error ? (
            <section className="mt-8 border-t border-[#e1ebea] py-8" role="alert">
              <h1 className="text-xl font-semibold text-[#203638]">Unable to load applicant</h1>
              <p className="mt-2 text-sm text-[#667b7c]">{applicantStage.error}</p>
              <button type="button" onClick={applicantStage.reload} className="mt-4 rounded-lg bg-[#0e8e9b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a727d]">
                Try again
              </button>
            </section>
          ) : (
            <ApplicantNotFoundState />
          )
        ) : (
          <>
            <ApplicantDetailHeader applicant={applicant} status={status ?? applicant.status} />

            {status ? (
              <ApplicantStageStepper
                status={status}
                history={applicantStage.history}
                isSaving={applicantStage.isSaving}
                error={applicantStage.error}
                hiredAt={applicantStage.applicant?.hiredAt}
                rejectionReason={applicantStage.applicant?.rejectionReason}
                interviewDetails={applicantStage.applicant?.interviewDetails}
                onAdvance={applicantStage.advance}
                onReject={applicantStage.reject}
                onRetry={applicantStage.retry}
              />
            ) : null}

            <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <ApplicantProfileSection
                  applicant={applicant}
                  selectedPortfolio={selectedPortfolio}
                  onDocumentOpen={openDocument}
                  onPortfolioClose={() => setSelectedPortfolio(null)}
                />
              </div>

              <ApplicantSidebar
                applicant={applicant}
                contactError={contactError}
                contactLoading={contactLoading}
                onContactApplicant={handleContactApplicant}
              />
            </div>
          </>
        )}
      </main>

      <ApplicantDocumentPreviewDialog
        selectedDocument={selectedDocument}
        isDownloading={documentLoading}
        downloadError={documentError}
        onDownload={handleDownloadDocument}
        onClose={() => setSelectedDocument(null)}
      />

      {showContactDialog && applicant && messagingActor ? (
        <ContactApplicantDialog
          actor={messagingActor}
          applicantName={applicant.name}
          applicationId={getApplicationId(applicant.id)}
          company={messagingActor.companyName ?? "your company"}
          role={applicant.role}
          onClose={() => setShowContactDialog(false)}
          onStarted={handleConversationStarted}
        />
      ) : null}
    </EmployerWorkspaceLayout>
  );
}
