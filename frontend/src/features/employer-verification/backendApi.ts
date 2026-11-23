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

export type StoredCompanyMediaAsset = {
  id: number;
  url: string;
  alt_text: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
};

export type EmployerCompany = {
  id: number;
  name: string;
  category_id: number | null;
  company_size: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  media: StoredCompanyMediaAsset[];
};

export const employerVerificationUpdatedEvent =
  "careerconnect:employer-verification-updated";

function notifyVerificationUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(employerVerificationUpdatedEvent));
  }
}

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
    return apiRequest<{ company: EmployerCompany | null }>("/employer/company", {}, token);
  },

  async updateCompany(token: string, data: Record<string, unknown>) {
    const response = await apiRequest<{ message: string; company: EmployerCompany }>(
      "/employer/company",
      { method: "PUT", data },
      token,
    );
    notifyVerificationUpdated();
    return response;
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
    notifyVerificationUpdated();
    return response.logo_url;
  },

  async deleteLogo(token: string): Promise<void> {
    await apiRequest("/employer/company/logo", { method: "DELETE" }, token);
    notifyVerificationUpdated();
  },

  async uploadCompanyMedia(
    token: string,
    file: File,
    altText: string,
    onProgress: (progress: number) => void,
  ): Promise<StoredCompanyMediaAsset> {
    const formData = new FormData();
    formData.set("photo", file);
    formData.set("alt_text", altText);
    const response = await apiRequest<{ media: StoredCompanyMediaAsset }>(
      "/employer/company/media",
      {
        method: "POST",
        data: formData,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
      token,
    );
    notifyVerificationUpdated();
    return response.media;
  },

  async deleteCompanyMedia(token: string, mediaId: string): Promise<void> {
    await apiRequest(`/employer/company/media/${mediaId}`, { method: "DELETE" }, token);
    notifyVerificationUpdated();
  },

  status(token: string) {
    return apiRequest<{
      status: "incomplete" | "pending" | "verified" | "rejected";
      company_profile_complete: boolean;
      profile_strength: {
        percent: number;
        missing: string[];
      };
      requires_reauthentication: boolean;
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

    const document = mapDocument(response.document, employerId);
    notifyVerificationUpdated();
    return document;
  },

  async remove(token: string, documentId: string): Promise<void> {
    await apiRequest(`/employer/verification/documents/${documentId}`, {
      method: "DELETE",
    }, token);
    notifyVerificationUpdated();
  },

  async download(token: string, documentId: string): Promise<Blob> {
    return apiBlob(`/employer/verification/documents/${documentId}/download`, token);
  },

  async submit(token: string): Promise<void> {
    await apiRequest("/employer/verification/submit", { method: "POST" }, token);
    notifyVerificationUpdated();
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
