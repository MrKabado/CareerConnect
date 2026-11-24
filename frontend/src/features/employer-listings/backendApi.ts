import { apiRequest } from "@/lib/axios";
import type { EmployerJobListing } from "@/features/jobs/backendApi";

export type EmployerCategory = { id: number; name: string };
export type CreateEmployerListingPayload = {
  listing_type: "job" | "ojt";
  save_as_draft?: boolean;
  title?: string | null;
  category_id?: number;
  custom_category_name?: string | null;
  applicant_limit?: number | null;
  expires_at?: string | null;
  description?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  required_skills?: string[];
  location?: string | null;
  region_code?: string | null;
  province_code?: string | null;
  city_municipality_code?: string | null;
  barangay_code?: string | null;
  street_address?: string | null;
  zip_code?: string | null;
  work_setup?: "onsite" | "hybrid" | "remote" | null;
  experience_required?: boolean;
  minimum_experience_years?: number | null;
  employment_type?: "full_time" | "part_time" | "contract";
  salary_min?: number | null;
  salary_max?: number | null;
  duration_hours?: number | null;
  allowance_type?: "paid" | "unpaid" | null;
  allowance_amount?: number | null;
  slots?: number | null;
  accepted_courses?: string[];
  moa_accepted?: boolean;
};
export type EmployerListingFilters = {
  page?: number;
  per_page?: number;
};

type Paginated<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export const employerListingsApi = {
  categories() {
    return apiRequest<{ data: EmployerCategory[] }>("/categories");
  },

  listings(token: string, filters: EmployerListingFilters = {}) {
    return apiRequest<Paginated<EmployerJobListing>>(
      "/employer/jobs",
      { params: { per_page: 50, ...filters } },
      token,
    );
  },

  create(token: string, data: CreateEmployerListingPayload) {
    return apiRequest<{ data: EmployerJobListing }>(
      "/jobs",
      { method: "POST", data },
      token,
    );
  },

  updateStatus(token: string, id: number, status: "draft" | "open" | "closed") {
    return apiRequest<{ message: string; listing: EmployerJobListing }>(
      `/jobs/${id}/status`,
      { method: "PATCH", data: { status } },
      token,
    );
  },
  update(token: string, id: number, data: CreateEmployerListingPayload) {
    return apiRequest<{ data: EmployerJobListing }>(
      `/jobs/${id}`,
      { method: "PUT", data },
      token,
    );
  },
};
