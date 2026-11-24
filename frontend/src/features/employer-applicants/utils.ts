import type { Applicant, ApplicantDocument } from "@/features/employer-applicants/types";

export function getApplicantPortfolioUrl(applicant: Applicant): string | null {
  const portfolioDocument = applicant.documents.find(
    (document) => getExternalDocumentUrl(document) !== null,
  );
  return portfolioDocument ? getExternalDocumentUrl(portfolioDocument) : null;
}

export function getExternalDocumentUrl(document: ApplicantDocument): string | null {
  if (document.fileType !== "Link" || document.id === "generated-portfolio") return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(document.fileName)
        ? document.fileName
        : `https://${document.fileName}`,
    );
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function getGitHubUsername(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "github.com" && parsedUrl.hostname !== "www.github.com") {
      return null;
    }
    const username = parsedUrl.pathname.split("/").filter(Boolean)[0];
    return username && /^[a-z\d-]+$/i.test(username) ? username : null;
  } catch {
    return null;
  }
}

export function getApplicationId(applicantId: string): string {
  return applicantId.startsWith("application-")
    ? applicantId.slice("application-".length)
    : applicantId;
}

export function downloadApplicantDocument(document: ApplicantDocument) {
  const textFileBaseName =
    document.fileType === "Link"
      ? document.title.replace(/[^a-z0-9]+/gi, "_")
      : document.fileName.replace(/\.[^.]+$/, "");
  const downloadFileName = document.dataUrl
    ? document.fileName
    : `${textFileBaseName || "applicant-document"}.txt`;
  const anchor = window.document.createElement("a");

  if (document.dataUrl) {
    anchor.href = document.dataUrl;
  } else {
    const file = new Blob([document.preview.join("\n\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    anchor.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  anchor.download = downloadFileName;
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
