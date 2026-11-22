import { apiRequest } from "@/lib/axios";
import type { PublicJobListing } from "@/features/jobs/backendApi";

export type EmployerCategory = { id: number; name: string };
export type CreateEmployerListingPayload = {
  listing_type: "job" | "ojt";
  title: string;
  category_id: number;
  description: string;
  responsibilities: string;
  requirements: string;
  required_skills?: string[];
  location: string;
  work_setup: "onsite" | "hybrid" | "remote";
  experience_required?: boolean;
  minimum_experience_years?: number | null;
  employment_type?: "full_time" | "part_time" | "contract";
  salary_min?: number | null;
  salary_max?: number | null;
  duration_hours?: number;
  allowance_type?: "paid" | "unpaid";
  allowance_amount?: number | null;
  slots?: number;
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
    return apiRequest<Paginated<PublicJobListing>>(
      "/employer/jobs",
      { params: { per_page: 50, ...filters } },
      token,
    );
  },

  create(token: string, data: CreateEmployerListingPayload) {
    return apiRequest<{ data: PublicJobListing }>(
      "/jobs",
      { method: "POST", data },
      token,
    );
  },

  updateStatus(token: string, id: number, status: "draft" | "open" | "closed") {
    return apiRequest<{ message: string; listing: PublicJobListing }>(
      `/jobs/${id}/status`,
      { method: "PATCH", data: { status } },
      token,
    );
  },
};
