import { apiRequest } from "@/lib/axios";

export type PublicJobListing = {
  id: number;
  listing_type: "job" | "ojt";
  title: string;
  description: string;
  responsibilities: string[] | string | null;
  requirements: string[] | string | null;
  required_skills?: string[] | null;
  category?: { id: number; name: string } | null;
  location: string;
  work_setup: "onsite" | "hybrid" | "remote";
  experience_required?: boolean;
  minimum_experience_years?: number | null;
  employment_type: "full_time" | "part_time" | "contract" | null;
  salary_min: number | null;
  salary_max: number | null;
  ojt?: {
    duration_hours: number;
    allowance_type: "paid" | "unpaid";
    allowance_amount: number | null;
    slots: number;
    accepted_courses: string[] | null;
    moa_accepted: boolean;
  } | null;
  status: string;
  published_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  company?: { name: string; city: string | null; logo_path: string | null; logo_url: string | null } | null;
};

type Paginated<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type PublicJobFilters = {
  keyword?: string;
  location?: string;
  company_slug?: string;
  listing_type?: "job" | "ojt";
  category_id?: number;
  employment_type?: "full_time" | "part_time" | "contract";
  work_setup?: "onsite" | "hybrid" | "remote";
  page?: number;
  per_page?: number;
};

export const publicJobsApi = {
  list(filters: PublicJobFilters = {}) {
    return apiRequest<Paginated<PublicJobListing>>("/jobs", { params: filters });
  },

  async show(id: number) {
    const response = await apiRequest<{ data: PublicJobListing }>(`/jobs/${id}`);
    return response.data;
  },
};

export function listingText(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  return [value];
}

export function formatListingPay(listing: PublicJobListing): string {
  if (listing.listing_type === "ojt") {
    if (listing.ojt?.allowance_type === "unpaid") return "Unpaid";
    return listing.ojt?.allowance_amount == null
      ? "Allowance not specified"
      : `₱${listing.ojt.allowance_amount.toLocaleString()} allowance`;
  }
  if (listing.salary_min == null && listing.salary_max == null) return "Salary not specified";
  const minimum = listing.salary_min?.toLocaleString();
  const maximum = listing.salary_max?.toLocaleString();
  if (minimum && maximum) return `₱${minimum}–₱${maximum}`;
  return `₱${minimum ?? maximum}`;
}
