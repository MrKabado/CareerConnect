import { apiBlob, apiRequest } from "@/lib/axios";

export type ApplicantResumeFile = {
  id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  is_current: boolean;
  created_at: string | null;
};

type ResumeResponse = {
  data: ApplicantResumeFile | null;
};

export const applicantFilesApi = {
  async resume(token: string): Promise<ApplicantResumeFile | null> {
    const response = await apiRequest<ResumeResponse>("/applicant/resume", {}, token);
    return response.data;
  },

  async uploadResume(
    token: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<ApplicantResumeFile> {
    const formData = new FormData();
    formData.set("resume", file);
    const response = await apiRequest<ResumeResponse>(
      "/applicant/resume",
      {
        method: "POST",
        data: formData,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
      token,
    );
    if (!response.data) throw new Error("The server did not return the uploaded resume.");
    return response.data;
  },

  async deleteResume(token: string): Promise<void> {
    await apiRequest("/applicant/resume", { method: "DELETE" }, token);
  },

  downloadResume(token: string): Promise<Blob> {
    return apiBlob("/applicant/resume/download", token);
  },

  async uploadPhoto(
    token: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<string> {
    const formData = new FormData();
    formData.set("photo", file);
    const response = await apiRequest<{ photo_url: string }>(
      "/applicant/profile/photo",
      {
        method: "POST",
        data: formData,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
      token,
    );
    return response.photo_url;
  },

  deletePhoto(token: string) {
    return apiRequest<{ data: { profile_photo_url: string | null } }>(
      "/applicant/profile/photo",
      { method: "DELETE" },
      token,
    );
  },

  profile(token: string) {
    return apiRequest<{
      data: { profile_photo_url: string | null };
    }>("/applicant/profile", {}, token);
  },
};

export function downloadApplicantFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
