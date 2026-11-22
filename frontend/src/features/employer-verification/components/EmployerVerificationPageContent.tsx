import ErrorBoundary from "@/components/common/ErrorBoundary";
import { verificationDocumentRequirements } from "@/features/employer-verification/types";
import { useEmployerVerificationPage } from "@/features/employer-verification/hooks/useEmployerVerificationPage";
import VerificationDocumentItem from "@/features/employer-verification/components/verification/VerificationDocumentItem";
import VerificationSubmissionPanel from "@/features/employer-verification/components/verification/VerificationSubmissionPanel";
import { Link } from "react-router";

export default function EmployerVerificationPageContent() {
  const {
    employer,
    documents,
    isLoading,
    loadError,
    verificationError,
    verificationStatus,
    rejectionReason,
    refreshDocuments,
    uploading,
    uploadProgress,
    uploadError,
    submitError,
    submitting,
    removing,
    allDocumentsUploaded,
    handleFileChange,
    handleRemove,
    handleDownload,
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
          Upload the required business registration and business permit documents.
          Your files are stored privately and only authorized reviewers can access them.
        </p>
        <p className="mt-2 rounded-lg border border-[#dfe9e7] bg-[#f7faf9] px-3 py-2 text-xs leading-5 text-[#657779]">
          PDF, JPG, or PNG is accepted. Maximum 5 MB per file; compress or resize files that exceed the limit.
        </p>
        <p className="mt-2 text-xs leading-5 text-[#718082]">
          After submission, a CareerConnect administrator will review the documents and approve or reject the company.
        </p>
        <Link
          className="mt-3 inline-block text-xs font-semibold text-[#087879] underline underline-offset-2"
          to="/employer/verification/company-info"
        >
          Review company information
        </Link>

        {employer && <p className="mt-2 text-xs text-[#718082]">Signed in as {employer.email}</p>}

        {verificationError && (
          <p className="mt-4 rounded-lg bg-[#fff7f6] p-3 text-sm text-[#9b4e48]" role="alert">
            {verificationError}
          </p>
        )}
        {loadError && (
          <div className="mt-4 rounded-lg bg-[#fff7f6] p-3 text-sm text-[#9b4e48]" role="alert">
            <p>{loadError}</p>
            <button
              className="mt-2 font-semibold underline underline-offset-2"
              onClick={() => void refreshDocuments()}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {verificationStatus === "rejected" && rejectionReason && (
          <div
            className="mt-5 rounded-xl border border-[#f1d8d5] bg-[#fff7f6] p-4 text-sm text-[#9b4e48]"
            role="alert"
          >
            <strong>Update required:</strong> {rejectionReason}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <p className="rounded-xl bg-[#f3f8f7] p-4 text-sm text-[#657779]" role="status">
              Loading your verification documents…
            </p>
          ) : null}
          <ErrorBoundary>
            {verificationDocumentRequirements.map((requirement) => {
              const document = documents.find((item) => item.kind === requirement.kind);

              return (
                <VerificationDocumentItem
                  document={document}
                  key={requirement.kind}
                  onFileChange={handleFileChange}
                  onRemove={handleRemove}
                  onDownload={handleDownload}
                  requirement={requirement}
                  submitting={submitting || isLoading || Boolean(verificationError)}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  removing={removing === document?.id}
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
          disabled={isLoading || Boolean(verificationError)}
        />
      </section>
    </main>
  );
}
