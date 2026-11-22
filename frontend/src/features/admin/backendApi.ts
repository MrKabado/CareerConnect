import { apiBlob, apiRequest } from "@/lib/axios";

export type AdminDashboardStats = {
  total_applicants: number;
  total_employers: number;
  pending_verifications: { total: number; applicants: number; employers: number };
  total_job_listings: number;
  active_job_listings: number;
  total_applications: number;
  recommendations?: Array<{
    id: string;
    title: string;
    message: string;
    priority: "high" | "medium" | "low";
    action: string;
  }>;
};

export type AdminUserRecord = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employer" | "applicant";
  account_status: "active" | "deactivated" | "inactive";
  created_at: string | null;
  identity_verification: {
    status: "pending" | "verified" | "rejected";
    rejection_reason: string | null;
    created_at: string | null;
  } | null;
  company_verification: {
    id: number;
    company_name: string;
    status: "incomplete" | "pending" | "verified" | "rejected";
    rejection_reason: string | null;
  } | null;
};

export type AdminCategoryRecord = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_custom?: boolean;
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

export type AdminActivityPage = {
  data: AdminActivityRecord[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type AdminIdentityVerificationRecord = {
  id: number;
  applicant: { id: number; name: string; email: string };
  status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

export type AdminIdentityVerificationDetails = AdminIdentityVerificationRecord & {
  applicant: AdminIdentityVerificationRecord["applicant"] & {
    city: string | null;
    phone: string | null;
  };
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  features: { delete_users: boolean };
};

export const adminApi = {
  dashboard(token: string) {
    return apiRequest<{ data: AdminDashboardStats }>("/admin/dashboard", {}, token);
  },

  activity(token: string, filters: { page?: number; per_page?: number } = {}) {
    return apiRequest<AdminActivityPage>(
      "/admin/activity",
      { params: filters },
      token,
    );
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

  deleteUser(token: string, id: string, confirmationEmail: string) {
    return apiRequest<{ message: string }>(
      `/admin/users/${id}`,
      { method: "DELETE", data: { confirmation_email: confirmationEmail } },
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

  jobs(token: string, filters: { approval_status?: string; status?: string; page?: number } = {}) {
    return apiRequest<{
      data: Array<{
        id: number;
        title: string;
        listing_type: "job" | "ojt";
        status: string;
        custom_category_name: string | null;
        approval_status: "not_required" | "pending" | "approved" | "rejected";
        approval_reason: string | null;
        category: { id: number; name: string } | null;
        company: { name: string } | null;
        created_at: string | null;
        admin_actions: Array<{ action: string; reason: string | null; created_at: string | null }> | null;
      }>;
      meta: { current_page: number; last_page: number; total: number };
    }>("/admin/jobs", { params: { ...filters, per_page: 50 } }, token);
  },

  approveJobCategory(token: string, id: number) {
    return apiRequest<{ message: string }>(
      `/admin/jobs/${id}/approve-category`,
      { method: "POST" },
      token,
    );
  },

  rejectJobCategory(token: string, id: number, reason: string) {
    return apiRequest<{ message: string }>(
      `/admin/jobs/${id}/reject-category`,
      { method: "POST", data: { reason } },
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

  applicantIdentityVerifications(
    token: string,
    status: "all" | "pending" | "verified" | "rejected" = "pending",
    page = 1,
  ) {
    return apiRequest<{
      data: AdminIdentityVerificationRecord[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>(
      "/admin/identity-verifications",
      { params: { status, page, per_page: 50 } },
      token,
    );
  },

  applicantIdentityVerification(token: string, id: number) {
    return apiRequest<{ data: AdminIdentityVerificationDetails }>(
      `/admin/identity-verifications/${id}`,
      {},
      token,
    );
  },

  applicantIdentityVerificationDocument(token: string, id: number) {
    return apiBlob(`/admin/identity-verifications/${id}/document`, token);
  },

  reviewApplicantIdentityVerification(
    token: string,
    id: number,
    status: "verified" | "rejected",
    rejectionReason?: string,
  ) {
    return apiRequest<{ message: string; status: "verified" | "rejected" }>(
      `/admin/identity-verifications/${id}/review`,
      {
        method: "POST",
        data: {
          status,
          ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
        },
      },
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
