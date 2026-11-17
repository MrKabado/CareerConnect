import { useState } from "react";
import { getEmployerVerificationDocumentFile } from "@/features/employer-verification/api";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useEmployerVerificationDocuments } from "@/features/employer-verification/useEmployerVerificationDocuments";
import { verificationDocumentRequirements } from "@/features/employer-verification/types";

function formatFileSize(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployerVerificationDocuments() {
  const { employer } = useEmployerStatus();
  const documents = useEmployerVerificationDocuments(employer?.id ?? "");
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  const demoDocuments = [
    {
      id: "maya-business-permit-demo",
      employerId: employer?.id ?? "maya-philippines-demo",
      kind: "business_registration",
      fileName: "Maya Philippines Business Permit 2026.pdf",
      mimeType: "application/pdf",
      size: 1640000,
      uploadedAt: "2026-10-14T08:00:00.000Z",
    },
    {
      id: "maya-company-id-demo",
      employerId: employer?.id ?? "maya-philippines-demo",
      kind: "company_id",
      fileName: "Maya Philippines Company ID.pdf",
      mimeType: "application/pdf",
      size: 1240000,
      uploadedAt: "2026-10-15T09:30:00.000Z",
    },
    {
      id: "maya-employer-id-demo",
      employerId: employer?.id ?? "maya-philippines-demo",
      kind: "employer_id_primary",
      fileName: "Employer Valid ID 1.pdf",
      mimeType: "application/pdf",
      size: 1180000,
      uploadedAt: "2026-10-16T11:15:00.000Z",
    },
  ] as const;

  const displayDocuments = employer?.companyName === "Maya Philippines" && documents.length === 0
    ? demoDocuments
    : documents;

  function getDemoDocumentContent(document: (typeof demoDocuments)[number] | { id: string; kind: string; fileName: string; size: number }) {
    const documentName = document.fileName.toLowerCase();

    if (document.kind === "company_id" || documentName.includes("company id")) {
      return {
        title: "MAYA PHILIPPINES CORPORATION",
        subtitle: "Company Identification and Registration",
        rows: [
          ["Entity Name", "Maya Philippines"],
          ["Company Registration No.", "SEC-2024-001284"],
          ["TIN", "009-456-789-000"],
          ["Address", "25F Tower 1, Rockwell Center, Makati City"],
          ["Authorized Signatory", "Janelle P. Santos"],
          ["Issue Date", "15 January 2026"],
          ["Validity", "Valid until 15 January 2028"],
        ],
      };
    }

    if (document.kind === "employer_id_primary" || documentName.includes("id 1") || documentName.includes("valid id")) {
      return {
        title: "Government Issued Identification",
        subtitle: "Employee/Employer Valid ID",
        rows: [
          ["Full Name", "Janelle P. Santos"],
          ["Date of Birth", "12 April 1989"],
          ["Nationality", "Filipino"],
          ["ID Number", "P-45-78254"],
          ["Issued By", "Philippine National ID / Government"],
          ["Issue Date", "01 February 2024"],
          ["Valid Until", "01 February 2034"],
        ],
      };
    }

    return {
      title: "BUSINESS PERMIT / LICENSE / CERTIFICATION",
      subtitle: "Maya Philippines Operations Permit",
      rows: [
        ["Company", "Maya Philippines"],
        ["Permit No.", "BP-2026-1184"],
        ["Issued By", "City Government of Makati"],
        ["Address", "25F Tower 1, Rockwell Center, Makati City"],
        ["Nature of Business", "Digital Finance and Payments Services"],
        ["Issue Date", "02 March 2026"],
        ["Expiry Date", "01 March 2028"],
        ["Status", "Approved and Active"],
      ],
    };
  }

  function previewDocument(documentId: string) {
    if (employer?.companyName === "Maya Philippines") {
      setPreviewDocumentId(documentId);
      return;
    }

    const file = getEmployerVerificationDocumentFile(documentId);
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  const selectedDocument = displayDocuments.find((document) => document.id === previewDocumentId) ?? null;
  const selectedDocumentContent = selectedDocument ? getDemoDocumentContent(selectedDocument) : null;

  return (
    <section className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
      <h2 className="text-[14px] font-bold text-[#1d3034]">Verification documents</h2>
      <p className="mt-1 text-[11px] leading-5 text-[#6a7d7d]">
        Submitted company and employer identity documents with their review status.
      </p>

      <ul className="mt-4 space-y-3">
        {verificationDocumentRequirements.map((requirement) => {
          const document = displayDocuments.find((item) => item.kind === requirement.kind);
          const reviewStatus = !document
            ? "Not on file"
            : employer?.status === "approved"
              ? "Verified"
              : employer?.status === "rejected"
                ? "Action required"
                : "Under review";

          return (
            <li
              className="rounded-xl border border-[#edf1f0] bg-[#f9fcfb] p-3"
              key={requirement.kind}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-[#314547]">{requirement.label}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
                    reviewStatus === "Verified"
                      ? "bg-[#def4ee] text-[#228578]"
                      : reviewStatus === "Under review"
                        ? "bg-[#fff1d9] text-[#997329]"
                        : "bg-[#f3efed] text-[#796c67]"
                  }`}
                >
                  {reviewStatus}
                </span>
              </div>
              {document ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all text-[10px] leading-4 text-[#718082]">
                    {document.fileName} · {formatFileSize(document.size)}
                  </p>
                  {employer?.companyName === "Maya Philippines" || getEmployerVerificationDocumentFile(document.id) ? (
                    <button
                      className="text-[10px] font-semibold text-[#087879] underline underline-offset-2"
                      onClick={() => previewDocument(document.id)}
                      type="button"
                    >
                      Preview
                    </button>
                  ) : (
                    <span className="text-[9px] text-[#849293]">
                      Preview unavailable after reload in this demo
                    </span>
                  )}
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

      {selectedDocument && selectedDocumentContent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#214649]/35 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-[980px] overflow-hidden rounded-[16px] border border-[#dfeae8] bg-[#f0f2f1] shadow-[0_16px_40px_rgba(17,46,48,0.22)]">
            <div className="flex items-center justify-between border-b border-[#dfeae8] bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567074]">
                  {selectedDocument.kind === "business_registration" ? "Business permit" : selectedDocument.kind === "company_id" ? "Company ID" : "Valid ID"}
                </span>
                <span className="truncate text-[12px] text-[#758586]">{selectedDocument.fileName}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg bg-[#0e8d9e] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#0b7e8d]"
                  type="button"
                >
                  Download
                </button>
                <button
                  aria-label="Close document preview"
                  className="grid size-7 place-items-center rounded-full border border-[#dfeae8] bg-[#f6faf9] text-[12px] font-semibold text-[#53696a] hover:bg-[#edf5f4]"
                  onClick={() => setPreviewDocumentId(null)}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[76vh] overflow-y-auto bg-[#eceeea] p-5">
              <div className="mx-auto w-full max-w-[760px] rounded-[10px] border border-[#dfe3e1] bg-white px-6 py-8 shadow-[0_6px_18px_rgba(18,40,41,0.06)]">
                <div className="border-b border-[#e4eceb] pb-4 text-center">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-[#7a8f8d]">
                    {selectedDocumentContent.subtitle}
                  </p>
                  <h3 className="mt-3 text-[19px] font-bold tracking-[0.08em] text-[#1d3034]">
                    {selectedDocumentContent.title}
                  </h3>
                </div>

                <div className="mt-6 space-y-4 text-[11px] leading-6 text-[#495d5f]">
                  {selectedDocumentContent.rows.map(([label, value]) => (
                    <div className="flex items-start gap-4 border-b border-[#eff2f1] pb-2" key={`${selectedDocument.id}-${label}`}>
                      <span className="w-32 shrink-0 font-semibold text-[#506063]">{label}</span>
                      <span className="flex-1 text-[#30474a]">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-[#edf1ef] pt-5 text-center text-[9px] uppercase tracking-[0.18em] text-[#7a8f8d]">
                  Verified copy for employer onboarding review
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-[10px] leading-4 text-[#849293]">
        These documents are never included on applicant-facing company profiles.
        Production access must be enforced by backend authorization.
      </p>
      {/* TODO(backend): Retrieve document records only after verifying the signed-in employer owns them. */}
    </section>
  );
}
