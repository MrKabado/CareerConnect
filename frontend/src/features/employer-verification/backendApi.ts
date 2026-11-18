import { apiRequest, apiBlob } from "@/lib/axios";
import type {
  EmployerVerificationDocument,
  VerificationDocumentKind,
} from "@/features/employer-verification/types";

type StoredVerificationDocument = {
  id: number;
  type: VerificationDocumentKind;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type DocumentResponse = {
  message?: string;
  data?: StoredVerificationDocument[];
  document?: StoredVerificationDocument;
};

function mapDocument(
  document: StoredVerificationDocument,
  employerId: string,
): EmployerVerificationDocument {
  return {
    id: String(document.id),
    employerId,
    kind: document.type,
    fileName: document.original_filename,
    mimeType: document.mime_type,
    size: document.size_bytes,
    uploadedAt: document.created_at,
  };
}

export const employerVerificationFilesApi = {
  company(token: string) {
    return apiRequest<{
      company: {
        id: number;
        name: string;
        category_id: number | null;
        company_size: string | null;
        address: string | null;
        city: string | null;
        website: string | null;
        description: string | null;
        contact_phone: string | null;
        logo_url: string | null;
      } | null;
    }>("/employer/company", {}, token);
  },

  async uploadLogo(
    token: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<string> {
    const formData = new FormData();
    formData.set("logo", file);
    const response = await apiRequest<{ logo_url: string }>(
      "/employer/company/logo",
      {
        method: "POST",
        data: formData,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
      token,
    );
    return response.logo_url;
  },

  async deleteLogo(token: string): Promise<void> {
    await apiRequest("/employer/company/logo", { method: "DELETE" }, token);
  },

  status(token: string) {
    return apiRequest<{
      status: "incomplete" | "pending" | "verified" | "rejected";
      rejection_reason: string | null;
      rejection_note: string | null;
    }>("/employer/verification", {}, token);
  },

  async list(token: string, employerId: string): Promise<EmployerVerificationDocument[]> {
    const response = await apiRequest<{ data: StoredVerificationDocument[] }>(
      "/employer/verification/documents",
      {},
      token,
    );

    return response.data.map((document) => mapDocument(document, employerId));
  },

  async upload(
    token: string,
    employerId: string,
    kind: VerificationDocumentKind,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<EmployerVerificationDocument> {
    const formData = new FormData();
    formData.set("type", kind);
    formData.set("document", file);

    const response = await apiRequest<DocumentResponse>(
      "/employer/verification/documents",
      {
        method: "POST",
        data: formData,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
      token,
    );

    if (!response.document) {
      throw new Error("The server did not return the uploaded document.");
    }

    return mapDocument(response.document, employerId);
  },

  async remove(token: string, documentId: string): Promise<void> {
    await apiRequest(`/employer/verification/documents/${documentId}`, {
      method: "DELETE",
    }, token);
  },

  async download(token: string, documentId: string): Promise<Blob> {
    return apiBlob(`/employer/verification/documents/${documentId}/download`, token);
  },

  async submit(token: string): Promise<void> {
    await apiRequest("/employer/verification/submit", { method: "POST" }, token);
  },
};

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
