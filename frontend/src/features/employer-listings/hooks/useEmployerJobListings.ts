import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import {
  formatListingPay,
  listingText,
  type PublicJobListing,
} from "@/features/jobs/backendApi";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";
import {
  employerListingsApi,
  type CreateEmployerListingPayload,
  type EmployerCategory,
} from "@/features/employer-listings/backendApi";
import type { EmployerListing } from "@/features/employer-listings/listings";

export const filterOptions = ["All statuses", "Jobs", "OJT"] as const;
export type JobFilter = (typeof filterOptions)[number];

type NewListingFormState = {
  title: string;
  categoryId: string;
  location: string;
  workSetup: string;
  availableSlots: string;
  requiredHours: string;
  summary: string;
  responsibilities: string;
  requirements: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  allowanceType: string;
  allowanceAmount: string;
  acceptedCourses: string;
  moaAccepted: string;
};

function emptyForm(location = ""): NewListingFormState {
  return {
    title: "",
    categoryId: "",
    location,
    workSetup: "Hybrid",
    availableSlots: "1",
    requiredHours: "480",
    summary: "",
    responsibilities: "",
    requirements: "",
    employmentType: "full_time",
    salaryMin: "",
    salaryMax: "",
    allowanceType: "paid",
    allowanceAmount: "",
    acceptedCourses: "",
    moaAccepted: "true",
  };
}

function toListing(listing: PublicJobListing): EmployerListing {
  const companySlug = (listing.company?.name ?? "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = listing.updated_at ? new Date(listing.updated_at) : null;
  return {
    id: String(listing.id),
    publicId: String(listing.id),
    companySlug,
    title: listing.title,
    type: listing.listing_type === "ojt" ? "OJT" : "Job",
    category: listing.category?.name ?? "Uncategorized",
    location: listing.location,
    department: listing.category?.name ?? "",
    status: listing.status === "open"
      ? "active"
      : listing.status === "draft"
        ? "draft"
        : listing.status === "deactivated" ? "deactivated" : "closed",
    updated: date && !Number.isNaN(date.getTime())
      ? `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)}`
      : "Date not available",
    description: listing.description,
    responsibilities: listingText(listing.responsibilities),
    salary: formatListingPay(listing),
    skills: listingText(listing.requirements),
    hiring: {
      type: listing.listing_type === "ojt"
        ? "OJT"
        : listing.employment_type?.replace("_", " ") ?? "Not specified",
      schedule: listing.work_setup === "onsite"
        ? "On-site"
        : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
      schoolPartnerships: listing.ojt?.accepted_courses?.join(", ") || "Not specified",
      workspace: listing.location,
    },
  };
}

function normalizeWorkSetup(value: string): "onsite" | "hybrid" | "remote" {
  if (value === "onsite" || value === "hybrid" || value === "remote") return value;
  throw new Error("Select a valid work setup.");
}

function createPayload(
  form: NewListingFormState,
  type: "job" | "ojt",
): CreateEmployerListingPayload {
  const common = {
    listing_type: type,
    title: form.title.trim(),
    category_id: Number(form.categoryId),
    description: form.summary.trim(),
    responsibilities: form.responsibilities.trim(),
    requirements: form.requirements.trim(),
    location: form.location.trim(),
    work_setup: normalizeWorkSetup(form.workSetup),
  };
  if (type === "job") {
    return {
      ...common,
      employment_type: form.employmentType as "full_time" | "part_time" | "contract",
      salary_min: form.salaryMin ? Number(form.salaryMin) : null,
      salary_max: form.salaryMax ? Number(form.salaryMax) : null,
    };
  }
  return {
    ...common,
    duration_hours: Number(form.requiredHours),
    allowance_type: form.allowanceType as "paid" | "unpaid",
    allowance_amount: form.allowanceType === "paid" && form.allowanceAmount
      ? Number(form.allowanceAmount)
      : null,
    slots: Number(form.availableSlots),
    accepted_courses: form.acceptedCourses.split(",").map((course) => course.trim()).filter(Boolean),
    moa_accepted: form.moaAccepted === "true",
  };
}

export function useEmployerJobListings() {
  const { token } = useAuth();
  const [companyProfile, setCompanyProfile] = useState({ name: "Company profile", location: "" });
  const [listings, setListings] = useState<EmployerListing[]>([]);
  const [categories, setCategories] = useState<EmployerCategory[]>([]);
  const [filter, setFilter] = useState<JobFilter>("All statuses");
  const [selectedId, setSelectedId] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListingType, setNewListingType] = useState<"job" | "ojt" | null>(null);
  const [newListingStep, setNewListingStep] = useState<1 | 2>(1);
  const [newListingForm, setNewListingForm] = useState<NewListingFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [listingResponse, categoryResponse, companyResponse] = await Promise.all([
        employerListingsApi.listings(token),
        employerListingsApi.categories(),
        employerVerificationFilesApi.company(token),
      ]);
      const listingPages = await Promise.all(
        Array.from(
          { length: Math.max(0, listingResponse.meta.last_page - 1) },
          (_, index) =>
            employerListingsApi.listings(token, {
              page: index + 2,
              per_page: 50,
            }),
        ),
      );
      const mapped = [
        ...listingResponse.data,
        ...listingPages.flatMap((page) => page.data),
      ].map(toListing);
      setListings(mapped);
      setCategories(categoryResponse.data);
      setCompanyProfile({
        name: companyResponse.company?.name || "Company profile",
        location: companyResponse.company?.city || companyResponse.company?.address || "",
      });
      setSelectedId((current) => mapped.some((listing) => listing.id === current)
        ? current
        : mapped[0]?.id ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your listings.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const visibleListings = useMemo(() => {
    if (filter === "Jobs") return listings.filter((listing) => listing.type === "Job");
    if (filter === "OJT") return listings.filter((listing) => listing.type === "OJT");
    return listings;
  }, [filter, listings]);
  const activeListingCount = listings.filter((listing) => listing.status === "active").length;
  const draftListingCount = listings.filter((listing) => listing.status === "draft").length;
  const modalTitle = newListingType === "ojt" ? "Create a new OJT opportunity" : "Create a new job";

  function openCreateModal() {
    setError(null);
    setNewListingType(null);
    setNewListingStep(1);
    setNewListingForm(emptyForm(companyProfile.location));
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setNewListingType(null);
    setNewListingStep(1);
  }

  function handleNewListingTypePick(type: "job" | "ojt") {
    setNewListingType(type);
    setNewListingStep(2);
  }

  function updateNewListingForm(field: keyof NewListingFormState, value: string) {
    setNewListingForm((current) => ({ ...current, [field]: value }));
  }

  async function saveNewListing(publishAfterSaving: boolean) {
    if (!token || !newListingType) return;
    if (!newListingForm.title.trim() || !newListingForm.categoryId || !newListingForm.summary.trim()
      || !newListingForm.responsibilities.trim() || !newListingForm.requirements.trim()
      || !newListingForm.location.trim()) {
      setError("Complete the required listing details before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await employerListingsApi.create(token, createPayload(newListingForm, newListingType));
      const created = toListing(response.data);
      setListings((current) => [created, ...current]);
      setSelectedId(created.id);
      if (publishAfterSaving) {
        try {
          const publishResponse = await employerListingsApi.updateStatus(
            token,
            Number(created.id),
            "open",
          );
          const published = toListing(publishResponse.listing);
          setListings((current) =>
            current.map((listing) =>
              listing.id === published.id ? published : listing,
            ),
          );
        } catch (publishError) {
          const message =
            publishError instanceof Error
              ? publishError.message
              : "The company may need verification before publishing.";
          setError(`The listing was saved as a draft but could not be published: ${message}`);
          closeCreateModal();
          return;
        }
      }
      closeCreateModal();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save the listing.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSaveDraft() {
    void saveNewListing(false);
  }

  function handlePublish() {
    void saveNewListing(true);
  }

  async function updateListingStatus(id: string, status: "draft" | "open" | "closed") {
    if (!token || !/^\d+$/.test(id)) return;
    setError(null);
    try {
      const response = await employerListingsApi.updateStatus(token, Number(id), status);
      const updated = toListing(response.listing);
      setListings((current) => current.map((listing) => listing.id === id ? updated : listing));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update listing status.");
    }
  }

  return {
    companyProfile,
    listings,
    visibleListings,
    categories,
    filter,
    setFilter,
    selectedId,
    setSelectedId,
    activeListingCount,
    draftListingCount,
    isCreateModalOpen,
    openCreateModal,
    closeCreateModal,
    newListingType,
    handleNewListingTypePick,
    newListingStep,
    setNewListingStep,
    newListingForm,
    updateNewListingForm,
    handleSaveDraft,
    handlePublish,
    modalTitle,
    isLoading,
    isSaving,
    error,
    retry: () => {
      setIsLoading(true);
      setError(null);
      void load();
    },
    updateListingStatus,
  };
}
