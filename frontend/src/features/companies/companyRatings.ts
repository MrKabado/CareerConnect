import { apiRequest } from "@/lib/axios";

export type CompanyRating = {
  rating: number;
  review: string | null;
};

export type CompanyRatingSummary = {
  average_rating: number | null;
  rating_count: number;
  user_rating: CompanyRating | null;
  can_rate: boolean;
  eligible_at: string | null;
  employment: {
    status: "current" | "former";
    started_at: string;
    ended_at: string | null;
    meets_minimum_tenure: boolean;
  } | null;
  ineligibility_reason: "current_employee" | "minimum_tenure" | null;
};

export function getCompanyRatingSummary(
  companySlug: string,
  token?: string,
) {
  return apiRequest<CompanyRatingSummary>(
    `/companies/${encodeURIComponent(companySlug)}/ratings`,
    {},
    token,
  );
}

export function saveCompanyRating(
  companySlug: string,
  rating: number,
  review: string,
  token: string,
) {
  return apiRequest<CompanyRatingSummary & { message: string }>(
    `/companies/${encodeURIComponent(companySlug)}/ratings`,
    {
      method: "PUT",
      data: { rating, review: review.trim() || null },
    },
    token,
  );
}
