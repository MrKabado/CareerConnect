import { useMemo, useState, useSyncExternalStore } from "react";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import {
  getEmployerListingsSnapshot,
  saveEmployerListing,
  subscribeEmployerListings,
  type EmployerListing,
} from "@/features/employer-listings/listings";
import { getCompanyProfileSlug } from "@/features/companies/companyProfiles";
import { useCompanyProfile } from "@/features/companies/useCompanyProfile";

export const filterOptions = ["All statuses", "Jobs", "OJT"] as const;
export type JobFilter = (typeof filterOptions)[number];

type NewListingFormState = {
  title: string;
  department: string;
  location: string;
  workSetup: string;
  availableSlots: string;
  requiredHours: string;
  summary: string;
};

export function useEmployerJobListings() {
  const { employer } = useEmployerStatus();
  const registeredCompanyName = employer?.companyName ?? "Maya Philippines";
  const companyProfile = useCompanyProfile(registeredCompanyName);
  const companySlug = getCompanyProfileSlug(registeredCompanyName);

  const allListings = useSyncExternalStore(
    subscribeEmployerListings,
    getEmployerListingsSnapshot,
    getEmployerListingsSnapshot,
  );

  const listings = useMemo(
    () => allListings.filter((listing) => listing.companySlug === companySlug),
    [allListings, companySlug],
  );

  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<JobFilter>("All statuses");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListingType, setNewListingType] = useState<"job" | "ojt" | null>(null);
  const [newListingStep, setNewListingStep] = useState<1 | 2>(1);
  const [newListingForm, setNewListingForm] = useState<NewListingFormState>({
    title: "",
    department: "",
    location: companyProfile.location,
    workSetup: "Hybrid",
    availableSlots: "6",
    requiredHours: "480",
    summary: "",
  });

  const visibleListings = useMemo(() => {
    if (filter === "Jobs") return listings.filter((listing) => listing.type === "Job");
    if (filter === "OJT") return listings.filter((listing) => listing.type === "OJT");
    return listings;
  }, [filter, listings]);

  const selectedListing = visibleListings.find((listing) => listing.id === selectedId) ?? null;
  const activeListingCount = listings.filter((listing) => listing.status === "active").length;
  const draftListingCount = listings.filter((listing) => listing.status === "draft").length;
  const modalTitle = newListingType === "ojt" ? "Create a new OJT opportunity" : "Create a new job";

  function openCreateModal() {
    setNewListingType(null);
    setNewListingStep(1);
    setNewListingForm({
      title: "",
      department: "",
      location: companyProfile.location,
      workSetup: "Hybrid",
      availableSlots: "6",
      requiredHours: "480",
      summary: "",
    });
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

  function handleSaveDraft() {
    if (!newListingType || !newListingForm.title.trim()) return;

    const id = `listing-${globalThis.crypto.randomUUID()}`;
    const listing: EmployerListing = {
      id,
      publicId: id,
      companySlug,
      title: newListingForm.title.trim(),
      type: newListingType === "ojt" ? "OJT" : "Job",
      category: newListingForm.department.trim() || "General",
      location: newListingForm.location.trim(),
      department: newListingForm.department.trim(),
      applicants: 0,
      shortlisted: 0,
      status: "draft",
      updated: "Draft saved just now",
      description: newListingForm.summary.trim(),
      responsibilities: [],
      salary: newListingType === "ojt" ? `Paid · ${newListingForm.requiredHours} hours` : "Competitive salary",
      skills: [],
      hiring: {
        type: newListingType === "ojt" ? "OJT" : "Full-time",
        schedule: newListingForm.workSetup,
        schoolPartnerships: "Open to relevant students and graduates.",
        workspace: newListingForm.location.trim(),
      },
    };

    saveEmployerListing(listing);
    setSelectedId(id);
    closeCreateModal();
  }

  return {
    companyProfile,
    listings,
    visibleListings,
    selectedListing,
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
    modalTitle,
  };
}
