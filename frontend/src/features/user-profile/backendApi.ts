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

export type ApplicantProfileData = {
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  profile_links: {
    portfolio?: string | null;
    github?: string | null;
    linkedin?: string | null;
    other?: { label: string; url: string } | null;
  } | null;
  profile_photo_url: string | null;
  looking_for_jobs: boolean;
  looking_for_ojt: boolean;
  interests: { id: number; name: string }[];
  skills: string[];
  work_setups: string[] | null;
  preferred_locations: string[] | null;
  desired_titles: string[] | null;
  employment_types: string[] | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  ojt_details: {
    school?: string | null;
    course?: string | null;
    year_level?: number | null;
    required_hours?: number | null;
    preferred_start_date?: string | null;
    allowance_preference?: string | null;
    requires_moa?: boolean | null;
  } | null;
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

  async uploadOnboardingResume(
    token: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<ApplicantResumeFile> {
    const formData = new FormData();
    formData.set("resume", file);
    const response = await apiRequest<ResumeResponse>(
      "/onboarding/resume",
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
      data: ApplicantProfileData;
    }>("/applicant/profile", {}, token);
  },

  updateProfile(
    token: string,
    details: { name?: string; phone?: string | null; city?: string | null },
  ) {
    return apiRequest<{ data: ApplicantProfileData }>(
      "/applicant/profile",
      { method: "PUT", data: details },
      token,
    );
  },

  updatePreferences(
    token: string,
    details: {
      skills?: string[];
      work_setups?: string[];
      preferred_locations?: string[];
      desired_titles?: string[];
      employment_types?: string[];
      salary_min?: number | null;
      salary_max?: number | null;
      experience_level?: string | null;
      ojt_details?: {
        school?: string | null;
        course?: string | null;
        year_level?: number | null;
        required_hours?: number | null;
        preferred_start_date?: string | null;
        allowance_preference?: string | null;
        requires_moa?: boolean | null;
      };
      profile_links?: {
        portfolio?: string | null;
        github?: string | null;
        linkedin?: string | null;
        other?: { label: string; url: string } | null;
      } | null;
    },
  ) {
    return apiRequest<{ data: ApplicantProfileData }>(
      "/applicant/preferences",
      { method: "PATCH", data: details },
      token,
    );
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
