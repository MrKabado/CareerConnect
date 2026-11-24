import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import {
  downloadBlob,
  employerVerificationFilesApi,
} from "@/features/employer-verification/backendApi";
import { useEmployerVerificationDocuments } from "@/features/employer-verification/useEmployerVerificationDocuments";
import { verificationDocumentRequirements } from "@/features/employer-verification/types";

function formatFileSize(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployerVerificationDocuments() {
  const { user, token } = useAuth();
  const employerId = user?.role === "employer" ? String(user.id) : null;
  const { documents, isLoading, error } = useEmployerVerificationDocuments(
    token,
    employerId,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !employerId) return;
    let active = true;
    employerVerificationFilesApi
      .status(token)
      .then((response) => {
        if (active) {
          setStatus(response.status);
          setStatusError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setStatus(null);
          setStatusError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load verification status.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [employerId, token]);

  async function handleDownload(documentId: string, fileName: string) {
    if (!token) return;
    setDownloadError(null);
    try {
      downloadBlob(await employerVerificationFilesApi.download(token, documentId), fileName);
    } catch (requestError) {
      setDownloadError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be downloaded.",
      );
    }
  }

  const statusLabel =
    status === "verified"
      ? "Verified"
      : status === "rejected"
        ? "Action required"
        : status === "pending"
          ? "Under review"
          : status === "incomplete"
            ? "Not submitted"
            : "Status unavailable";

  return (
    <section className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
      <h2 className="text-[14px] font-bold text-[#1d3034]">Verification documents</h2>
      <p className="mt-1 text-[11px] leading-5 text-[#6a7d7d]">
        Your private company documents and review status.
      </p>
      {(error || statusError || downloadError) && (
        <p className="mt-3 text-xs text-[#a2534c]" role="alert">
          {error ?? statusError ?? downloadError}
        </p>
      )}
      {isLoading ? (
        <p className="mt-4 text-xs text-[#718082]" role="status">
          Loading verification documents…
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {verificationDocumentRequirements.map((requirement) => {
            const document = documents.find((item) => item.kind === requirement.kind);
            return (
              <li
                className="rounded-xl border border-[#edf1f0] bg-[#f9fcfb] p-3"
                key={requirement.kind}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-[#314547]">
                    {requirement.label}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#f3efed] px-2 py-1 text-[9px] font-semibold text-[#796c67]">
                    {document ? statusLabel : "Not on file"}
                  </span>
                </div>
                {document ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all text-[10px] leading-4 text-[#718082]">
                      {document.fileName} · {formatFileSize(document.size)}
                    </p>
                    <button
                      className="text-[10px] font-semibold text-[#087879] underline underline-offset-2"
                      onClick={() => void handleDownload(document.id, document.fileName)}
                      type="button"
                    >
                      Download
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-[#849293]">
                    No document was submitted for this requirement.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-[10px] leading-4 text-[#849293]">
        Uploaded files and personal details are only available through authorized access.
      </p>
    </section>
  );
}
