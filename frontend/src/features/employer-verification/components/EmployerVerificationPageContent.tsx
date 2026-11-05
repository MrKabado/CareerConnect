import ErrorBoundary from "@/components/common/ErrorBoundary";
import { verificationDocumentRequirements } from "@/features/employer-verification/types";
import { useEmployerVerificationPage } from "@/features/employer-verification/hooks/useEmployerVerificationPage";
import VerificationDocumentItem from "@/features/employer-verification/components/verification/VerificationDocumentItem";
import VerificationSubmissionPanel from "@/features/employer-verification/components/verification/VerificationSubmissionPanel";

export default function EmployerVerificationPageContent() {
  const {
    employer,
    documents,
    uploading,
    uploadError,
    submitError,
    submitting,
    allDocumentsUploaded,
    handleFileChange,
    handleSubmit,
  } = useEmployerVerificationPage();

  return (
    <main className="min-h-dvh bg-[#f5f8f8] px-4 py-10 font-sans text-[#263a3c]">
      <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-[#e5eeec] bg-white p-6 shadow-[0_8px_30px_rgba(27,54,52,0.08)] md:p-9">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#078b8d]">
          CareerConnect for employers
        </p>
        <h1 className="mt-3 text-2xl font-bold">Verify your company</h1>
        <p className="mt-2 text-sm leading-6 text-[#718082]">
          Submit the required company and employer identity documents. All four
          documents must be uploaded before your company can be reviewed.
        </p>

        {employer?.status === "rejected" && employer.rejectionReason && (
          <div
            className="mt-5 rounded-xl border border-[#f1d8d5] bg-[#fff7f6] p-4 text-sm text-[#9b4e48]"
            role="alert"
          >
            <strong>Update required:</strong> {employer.rejectionReason}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <ErrorBoundary>
            {verificationDocumentRequirements.map((requirement) => {
              const document = documents.find((item) => item.kind === requirement.kind);

              return (
                <VerificationDocumentItem
                  document={document}
                  key={requirement.kind}
                  onFileChange={handleFileChange}
                  requirement={requirement}
                  submitting={submitting}
                  uploading={uploading}
                />
              );
            })}
          </ErrorBoundary>
        </div>

        <VerificationSubmissionPanel
          allDocumentsUploaded={allDocumentsUploaded}
          documentsCount={documents.length}
          onSubmit={handleSubmit}
          submitError={submitError}
          submitting={submitting}
          uploadError={uploadError}
          uploading={uploading !== null}
        />
      </section>
    </main>
  );
}
