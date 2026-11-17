import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { publishListing } from "@/features/employer-listings/api";
import { fallbackListing } from "@/features/employer-listings/constants";
import {
  getEmployerListingsSnapshot,
  saveEmployerListing,
} from "@/features/employer-listings/listings";
import { useListingOnboarding } from "@/features/employer-listings/useListingOnboarding";
import type {
  DefaultsSnapshot,
  OnboardingStatus,
  ReviewDraftValues,
  ReviewListing,
} from "@/features/employer-listings/types";
import { useCompanyProfile } from "@/features/companies/useCompanyProfile";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";

function createDraft(listing: ReviewListing): ReviewDraftValues {
  return {
    title: listing.title,
    category: listing.category,
    location: listing.location,
    department: listing.department,
    type: listing.type,
    schedule: listing.hiring.schedule,
    workspace: listing.hiring.workspace,
    schoolPartnerships: listing.hiring.schoolPartnerships,
    acceptedCourses: "Computer Science, Information Technology, Software Engineering",
    description: listing.description,
    responsibilities: listing.responsibilities.join("\n"),
  };
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getStatusBadgeClasses(status: OnboardingStatus) {
  if (status === "confirmed") {
    return "border border-[#d5f1e5] bg-[#ecf9f5] text-[#1d9d75]";
  }

  if (status === "needs_changes") {
    return "border border-[#f6e6b6] bg-[#fff6df] text-[#bd8a12]";
  }

  return "border border-[#dfeae8] bg-[#f3f8f8] text-[#4d6367]";
}

export function getStatusLabel(status: OnboardingStatus) {
  if (status === "confirmed") return "Confirmed";
  if (status === "needs_changes") return "Needs changes";
  return "Pending confirmation";
}

export function useEmployerListingReview(initialListing: ReviewListing = fallbackListing) {
  const navigate = useNavigate();
  const listing = initialListing;

  const { employer } = useEmployerStatus();
  const companyName = useCompanyProfile(employer?.companyName ?? "Maya Philippines").name;

  const [draft, setDraft] = useState<ReviewDraftValues>(() => createDraft(listing));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingNotice] = useState<string | null>(() => {
    return window.sessionStorage.getItem("employerListingNotice");
  });
  const [notice, setNotice] = useState<string | null>(pendingNotice);
  const [isPublished, setIsPublished] = useState(() => {
    try {
      const publishedMap = JSON.parse(
        window.localStorage.getItem("careerconnect.employer-listings.published") ?? "{}",
      ) as Record<string, string | null>;
      return Boolean(publishedMap[listing.id]);
    } catch {
      return false;
    }
  });

  const { status, record, error, isLoading, confirm, reset } = useListingOnboarding(listing.id);

  useEffect(() => {
    if (!pendingNotice) return;
    window.sessionStorage.removeItem("employerListingNotice");
    void reset();
  }, [pendingNotice, reset]);

  const defaultsSnapshot = useMemo<DefaultsSnapshot>(() => {
    return {
      hiringFor: draft.type,
      defaultWorkspace: draft.workspace,
      schoolPartnerships: draft.schoolPartnerships,
      acceptedCourses: draft.acceptedCourses
        .split(",")
        .map((course) => course.trim())
        .filter(Boolean),
      listingType: draft.type,
    };
  }, [draft]);

  const confirmationSummary =
    status === "confirmed" && record?.confirmedBy && record.confirmedAt
      ? `Confirmed by ${record.confirmedBy} on ${formatTimestamp(record.confirmedAt)}`
      : null;

  const canPublish = status === "confirmed" && !isPublished;
  const isDevPanelVisible = import.meta.env.DEV;

  async function handleConfirmSubmission() {
    const confirmed = await confirm(companyName, defaultsSnapshot);
    if (!confirmed) {
      return;
    }

    setNotice(`Confirmed by ${companyName} on ${formatTimestamp(confirmed.confirmedAt)}`);
    setIsDialogOpen(false);
  }

  async function handlePublish() {
    if (!canPublish) {
      return;
    }

    try {
      setNotice("Publishing listing...");
      const savedListing = getEmployerListingsSnapshot().find((item) => item.id === listing.id);
      if (!savedListing) {
        throw new Error("The listing could not be found.");
      }

      saveEmployerListing({
        ...savedListing,
        title: draft.title,
        category: draft.category,
        location: draft.location,
        department: draft.department,
        type: draft.type,
        description: draft.description,
        responsibilities: draft.responsibilities
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        hiring: {
          ...savedListing.hiring,
          type: draft.type === "OJT" ? "OJT" : savedListing.hiring.type,
          schedule: draft.schedule,
          schoolPartnerships: draft.schoolPartnerships,
          workspace: draft.workspace,
        },
        updated: "Published just now",
      });

      const published = await publishListing(listing.id);
      setIsPublished(Boolean(published?.publishedAt));
      setNotice(`Listing published successfully on ${formatTimestamp(published.publishedAt)}.`);
      navigate("/employer/listings", { replace: true });
    } catch {
      setNotice("Unable to publish this listing. Please try again.");
    }
  }

  return {
    companyName,
    draft,
    setDraft,
    status,
    record,
    error,
    isLoading,
    notice,
    setNotice,
    isDialogOpen,
    setIsDialogOpen,
    defaultsSnapshot,
    confirmationSummary,
    canPublish,
    isPublished,
    isDevPanelVisible,
    handleConfirmSubmission,
    handlePublish,
  };
}
