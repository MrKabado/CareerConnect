import { apiBlob, apiRequest } from "@/lib/axios";

export type AdminDashboardStats = {
  total_applicants: number;
  total_employers: number;
  pending_verifications: { total: number; applicants: number; employers: number };
  total_job_listings: number;
  active_job_listings: number;
  total_applications: number;
};

export type AdminUserRecord = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employer" | "applicant";
  account_status: "active" | "deactivated" | "inactive";
  created_at: string | null;
};

export type AdminCategoryRecord = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  job_count: number;
};

export type AdminActivityRecord = {
  id: number;
  action: string;
  title: string;
  description: string;
  actor_name: string | null;
  subject_name: string | null;
  created_at: string | null;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export const adminApi = {
  dashboard(token: string) {
    return apiRequest<{ data: AdminDashboardStats }>("/admin/dashboard", {}, token);
  },

  activity(token: string) {
    return apiRequest<{ data: AdminActivityRecord[] }>("/admin/activity", {}, token);
  },

  users(token: string, filters: { search?: string; role?: string; status?: string; page?: number }) {
    return apiRequest<Paginated<AdminUserRecord>>(
      "/admin/users",
      { params: { ...filters, per_page: 6 } },
      token,
    );
  },

  updateUserStatus(token: string, id: string, active: boolean) {
    return apiRequest<{ message: string; user: { id: number; account_status: string } }>(
      `/admin/users/${id}/status`,
      { method: "PATCH", data: { account_status: active ? "active" : "deactivated" } },
      token,
    );
  },

  categories(token: string) {
    return apiRequest<{ data: AdminCategoryRecord[] }>(
      "/admin/categories",
      {},
      token,
    );
  },

  createCategory(token: string, values: { name: string; description?: string }) {
    return apiRequest<{ category: AdminCategoryRecord }>(
      "/admin/categories",
      { method: "POST", data: values },
      token,
    );
  },

  updateCategory(token: string, id: string, values: { name: string; description?: string }) {
    return apiRequest<{ category: AdminCategoryRecord }>(
      `/admin/categories/${id}`,
      { method: "PUT", data: values },
      token,
    );
  },

  deleteCategory(token: string, id: string) {
    return apiRequest<{ message: string }>(
      `/admin/categories/${id}`,
      { method: "DELETE" },
      token,
    );
  },

  companyVerifications(token: string, status?: "incomplete" | "pending" | "verified" | "rejected", page = 1) {
    return apiRequest<{
      data: Array<{
        id: number;
        company: { id: number; name: string; owner: { id: number; name: string; email: string } };
        status: "incomplete" | "pending" | "verified" | "rejected";
        rejection_reason: string | null;
        submitted_at: string | null;
      }>;
      meta: { current_page: number; last_page: number; total: number };
    }>("/admin/company-verifications", { params: { ...(status ? { status } : {}), page, per_page: 50 } }, token);
  },

  companyVerification(token: string, id: string) {
    return apiRequest<{ data: {
      id: number;
      status: "incomplete" | "pending" | "verified" | "rejected";
      rejection_reason: string | null;
      submitted_at: string | null;
      company: { id: number; name: string; owner: { name: string; email: string }; city: string | null; address: string | null };
      documents: Array<{ id: number; type: string; original_filename: string; mime_type: string; size_bytes: number }>;
    } }>(`/admin/company-verifications/${id}`, {}, token);
  },

  reviewCompanyVerification(token: string, id: string, status: "verified" | "rejected", rejectionReason?: string) {
    return apiRequest<{ message: string }>(
      `/admin/company-verifications/${id}/review`,
      { method: "POST", data: { status, ...(rejectionReason ? { rejection_reason: rejectionReason } : {}) } },
      token,
    );
  },

  companyVerificationDocument(token: string, verificationId: string, documentId: string) {
    return apiBlob(
      `/admin/company-verifications/${verificationId}/documents/${documentId}`,
      token,
    );
  },
};

export function downloadAdminDocument(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return url;
}
