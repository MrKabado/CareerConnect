import { useLocation } from "react-router";
import EmployerListingReviewPageContent from "@/features/employer-listings/components/EmployerListingReviewPageContent";
import { fallbackListing } from "@/features/employer-listings/constants";
import type { ReviewLocationState } from "@/features/employer-listings/types";

export default function EmployerJobListingReviewPage() {
  const location = useLocation();
  const state = location.state as ReviewLocationState | null;
  const listing = state?.listing ?? fallbackListing;

  return <EmployerListingReviewPageContent key={listing.id} listing={listing} />;
}
