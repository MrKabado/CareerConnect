import { Navigate, useLocation } from "react-router";
import EmployerListingReviewPageContent from "@/features/employer-listings/components/EmployerListingReviewPageContent";
import type { ReviewLocationState } from "@/features/employer-listings/types";

export default function EmployerJobListingReviewPage() {
  const location = useLocation();
  const state = location.state as ReviewLocationState | null;
  const listing = state?.listing;

  if (!listing) return <Navigate to="/employer/listings" replace />;
  return <EmployerListingReviewPageContent key={listing.id} listing={listing} />;
}
