import { apiRequest } from "@/lib/axios";

export type CompanyRating = {
  rating: number;
  review: string | null;
};

export type CompanyRatingSummary = {
  average_rating: number | null;
  rating_count: number;
  user_rating: CompanyRating | null;
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
