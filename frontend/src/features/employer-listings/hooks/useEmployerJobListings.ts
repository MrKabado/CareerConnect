import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import {
  formatListingPay,
  listingText,
  type EmployerJobListing,
} from "@/features/jobs/backendApi";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";
import { toNameCase } from "@/features/auth/nameFormatting";
import {
  emptyPhilippineAddress,
  type PhilippineAddress,
} from "@/features/locations/types";
import { formatPhilippineAddressLabel } from "@/features/locations/api";
import {
  employerListingsApi,
  type CreateEmployerListingPayload,
  type EmployerCategory,
} from "@/features/employer-listings/backendApi";
import type { EmployerListing } from "@/features/employer-listings/listings";
import { subscribeToUserUpdates } from "@/lib/realtime";

export const filterOptions = ["All statuses", "Jobs", "OJT"] as const;
export type JobFilter = (typeof filterOptions)[number];

type NewListingFormState = {
  title: string;
  categoryId: string;
  customCategoryName: string;
  location: string;
  locationAddress: PhilippineAddress;
  latitude: number | null;
  longitude: number | null;
  workSetup: string;
  availableSlots: string;
  requiredHours: string;
  summary: string;
  responsibilities: string;
  requirements: string[];
  requiredSkills: string[];
  employmentType: string;
  experienceRequirement: "with_experience" | "without_experience";
  minimumExperienceYears: string;
  salaryMin: string;
  salaryMax: string;
  allowanceType: string;
  allowanceAmount: string;
  acceptedCourses: string;
  moaAccepted: string;
  applicantLimit: string;
  expiresAt: string;
};

function emptyForm(
  location = "",
  locationAddress: PhilippineAddress = emptyPhilippineAddress(),
): NewListingFormState {
  return {
    title: "",
    categoryId: "",
    customCategoryName: "",
    location: formatPhilippineAddressLabel(locationAddress) || location,
    locationAddress,
    latitude: null,
    longitude: null,
    workSetup: "hybrid",
    availableSlots: "1",
    requiredHours: "480",
    summary: "",
    responsibilities: "",
    requirements: [],
    requiredSkills: [],
    employmentType: "full_time",
    experienceRequirement: "without_experience",
    minimumExperienceYears: "1",
    salaryMin: "",
    salaryMax: "",
    allowanceType: "paid",
    allowanceAmount: "",
    acceptedCourses: "",
    moaAccepted: "true",
    applicantLimit: "25",
    expiresAt: "",
  };
}

function getSalaryRangeError(form: NewListingFormState): string | null {
  if (form.salaryMin.length > 9 || form.salaryMax.length > 9) {
    return "Salary values may contain no more than 9 digits.";
  }
  if (!form.salaryMin || !form.salaryMax) return null;

  const minimum = Number(form.salaryMin);
  const maximum = Number(form.salaryMax);
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum)
    || minimum < 0 || maximum < 0 || minimum > 999999999 || maximum > 999999999) {
    return "Salary values must contain no more than 9 digits.";
  }
  if (minimum > maximum) {
    return "Minimum salary cannot be higher than maximum salary.";
  }
  return null;
}

function getListingNumericError(form: NewListingFormState, type: "job" | "ojt"): string | null {
  const fields = type === "job"
    ? [
      { value: form.salaryMin, label: "Minimum salary", min: 0, max: 999999999 },
      { value: form.salaryMax, label: "Maximum salary", min: 0, max: 999999999 },
      { value: form.applicantLimit, label: "Applicant limit", min: 1, max: 4294967295 },
      ...(form.experienceRequirement === "with_experience"
        ? [{ value: form.minimumExperienceYears, label: "Minimum experience", min: 1, max: 50 }]
        : []),
    ]
    : [
      { value: form.availableSlots, label: "Available slots", min: 1, max: 65535 },
      { value: form.requiredHours, label: "Required hours", min: 1, max: 65535 },
      { value: form.applicantLimit, label: "Applicant limit", min: 1, max: 4294967295 },
      { value: form.allowanceAmount, label: "Monthly allowance", min: 0, max: 4294967295 },
    ];

  for (const field of fields) {
    if (!field.value) continue;
    const value = Number(field.value);
    if (!Number.isInteger(value) || value < field.min || value > field.max) {
      return `${field.label} must be a whole number from ${field.min.toLocaleString()} to ${field.max.toLocaleString()}.`;
    }
  }
  return null;
}

function toListing(listing: EmployerJobListing): EmployerListing {
  const companySlug = (listing.company?.name ?? "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = listing.updated_at ? new Date(listing.updated_at) : null;
  return {
    id: String(listing.id),
    publicId: String(listing.id),
    companySlug,
    title: listing.title ?? "",
    applicants: listing.applicant_count ?? 0,
    applicantLimit: listing.applicant_limit ?? listing.ojt?.slots ?? undefined,
    approvalStatus: listing.approval_status ?? "not_required",
    approvalReason: listing.approval_reason ?? null,
    type: listing.listing_type === "ojt" ? "OJT" : "Job",
    category: listing.category?.name ?? listing.custom_category_name ?? "",
    categoryId: listing.category?.id,
    location: listing.location ?? "",
    latitude: listing.latitude,
    longitude: listing.longitude,
    locationAddress: {
      ...emptyPhilippineAddress(),
      region_code: listing.region_code ?? null,
      region_name: listing.region_name ?? null,
      province_code: listing.province_code ?? null,
      province_name: listing.province_name ?? null,
      city_municipality_code: listing.city_municipality_code ?? null,
      city_municipality_name: listing.city_municipality_name ?? null,
      barangay_code: listing.barangay_code ?? null,
      barangay_name: listing.barangay_name ?? null,
      street_address: listing.street_address ?? null,
      zip_code: listing.zip_code ?? null,
    },
    department: listing.category?.name ?? "",
    status: listing.status === "open"
      ? "active"
      : listing.status === "draft"
        ? "draft"
        : listing.status === "deactivated"
          ? "deactivated"
          : listing.status === "full"
            ? "full"
            : listing.status === "expired"
              ? "expired"
              : "closed",
    updated: date && !Number.isNaN(date.getTime())
      ? `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)}`
      : "Date not available",
    description: listing.description ?? "",
    responsibilities: listingText(listing.responsibilities),
    requirements: listingText(listing.requirements),
    salary: formatListingPay(listing),
    skills: listing.required_skills?.length
      ? listing.required_skills
      : listingText(listing.requirements),
    experienceRequirement: listing.listing_type !== "job"
      ? undefined
      : listing.experience_required
        ? `At least ${listing.minimum_experience_years ?? 1} years`
        : "Without Experience",
    requiredSkills: listing.required_skills ?? [],
    workSetup: listing.work_setup ?? undefined,
    salaryMin: listing.salary_min,
    salaryMax: listing.salary_max,
    employmentType: listing.employment_type ?? undefined,
    experienceRequired: listing.experience_required,
    minimumExperienceYears: listing.minimum_experience_years,
    postedAt: listing.published_at,
    expiresAt: listing.expires_at,
    updatedAt: listing.updated_at,
    ojtDurationHours: listing.ojt?.duration_hours,
    ojtAllowanceType: listing.ojt?.allowance_type,
    ojtAllowanceAmount: listing.ojt?.allowance_amount,
    ojtSlots: listing.ojt?.slots,
    acceptedCourses: listing.ojt?.accepted_courses ?? [],
    moaAccepted: listing.ojt?.moa_accepted,
    hiring: {
      type: listing.listing_type === "ojt"
        ? "OJT"
        : listing.employment_type?.replace("_", " ") ?? "Not specified",
      schedule: listing.work_setup === "onsite"
        ? "On-site"
        : listing.work_setup
          ? listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1)
          : "Not specified",
      schoolPartnerships: listing.ojt?.accepted_courses?.join(", ") || "Not specified",
      workspace: listing.location ?? "",
    },
  };
}

function normalizeWorkSetup(value: string): "onsite" | "hybrid" | "remote" {
  if (value === "onsite" || value === "hybrid" || value === "remote") return value;
  throw new Error("Select a valid work setup.");
}

function capitalizeFirstLetter(value: string): string {
  return value.replace(/^(\s*)(\p{L})/u, (_match, whitespace: string, letter: string) =>
    `${whitespace}${letter.toLocaleUpperCase()}`,
  );
}

function createPayload(
  form: NewListingFormState,
  type: "job" | "ojt",
  saveAsDraft: boolean,
): CreateEmployerListingPayload {
  const common: CreateEmployerListingPayload = {
    listing_type: type,
    ...(saveAsDraft ? { save_as_draft: true } : {}),
    ...(form.title.trim() ? { title: toNameCase(form.title.trim()) } : {}),
    ...(form.categoryId && form.categoryId !== "other"
      ? { category_id: Number(form.categoryId) }
      : form.customCategoryName.trim()
        ? { custom_category_name: toNameCase(form.customCategoryName.trim()) }
        : {}),
    ...(form.summary.trim() ? { description: capitalizeFirstLetter(form.summary.trim()) } : {}),
    ...(form.responsibilities.trim()
      ? { responsibilities: capitalizeFirstLetter(form.responsibilities.trim()) }
      : {}),
    ...(form.requirements.length
      ? { requirements: form.requirements.map(capitalizeFirstLetter).join("\n") }
      : {}),
    ...(form.requiredSkills.length
      ? { required_skills: form.requiredSkills.map(toNameCase) }
      : {}),
    ...(form.location.trim() ? { location: toNameCase(form.location.trim()) } : {}),
    region_code: form.locationAddress.region_code,
    province_code: form.locationAddress.province_code,
    city_municipality_code: form.locationAddress.city_municipality_code,
    barangay_code: form.locationAddress.barangay_code,
    street_address: form.locationAddress.street_address,
    zip_code: form.locationAddress.zip_code,
    ...(form.latitude !== null && form.longitude !== null
      ? { latitude: form.latitude, longitude: form.longitude }
      : {}),
    ...(!saveAsDraft || form.workSetup !== "hybrid"
      ? { work_setup: normalizeWorkSetup(form.workSetup) }
      : {}),
    ...(!saveAsDraft || form.applicantLimit !== "25"
      ? { applicant_limit: form.applicantLimit ? Number(form.applicantLimit) : null }
      : {}),
    ...(form.expiresAt ? { expires_at: form.expiresAt } : {}),
  };
  if (type === "job") {
    return {
      ...common,
      ...(!saveAsDraft || form.employmentType !== "full_time"
        ? { employment_type: form.employmentType as "full_time" | "part_time" | "contract" }
        : {}),
      ...(!saveAsDraft || form.experienceRequirement === "with_experience"
        ? {
          experience_required: form.experienceRequirement === "with_experience",
          minimum_experience_years: form.experienceRequirement === "with_experience"
            ? (form.minimumExperienceYears ? Number(form.minimumExperienceYears) : null)
            : null,
        }
        : {}),
      ...(form.salaryMin !== "" ? { salary_min: Number(form.salaryMin) } : {}),
      ...(form.salaryMax !== "" ? { salary_max: Number(form.salaryMax) } : {}),
    };
  }
  return {
    ...common,
    ...(!saveAsDraft || form.requiredHours !== "480"
      ? { duration_hours: form.requiredHours ? Number(form.requiredHours) : null }
      : {}),
    ...(!saveAsDraft || form.allowanceType !== "paid"
      ? { allowance_type: form.allowanceType as "paid" | "unpaid" }
      : {}),
    allowance_amount: form.allowanceType === "paid" && form.allowanceAmount
      ? Number(form.allowanceAmount)
      : null,
    ...(!saveAsDraft || form.availableSlots !== "1"
      ? { slots: form.availableSlots ? Number(form.availableSlots) : null }
      : {}),
    ...(form.acceptedCourses.trim()
      ? { accepted_courses: form.acceptedCourses.split(",").map((course) => toNameCase(course.trim())).filter(Boolean) }
      : {}),
    ...(!saveAsDraft || form.moaAccepted !== "true"
      ? { moa_accepted: form.moaAccepted === "true" }
      : {}),
  };
}

export function useEmployerJobListings() {
  const { token } = useAuth();
  const [companyProfile, setCompanyProfile] = useState({
    name: "Company profile",
    location: "",
    locationAddress: emptyPhilippineAddress(),
  });
  const [listings, setListings] = useState<EmployerListing[]>([]);
  const [categories, setCategories] = useState<EmployerCategory[]>([]);
  const [filter, setFilter] = useState<JobFilter>("All statuses");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListingType, setNewListingType] = useState<"job" | "ojt" | null>(null);
  const [newListingStep, setNewListingStep] = useState<1 | 2>(1);
  const [newListingForm, setNewListingForm] = useState<NewListingFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [closingListingId, setClosingListingId] = useState<number | null>(null);

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
        locationAddress: {
          ...emptyPhilippineAddress(),
          region_code: companyResponse.company?.region_code ?? null,
          region_name: companyResponse.company?.region_name ?? null,
          province_code: companyResponse.company?.province_code ?? null,
          province_name: companyResponse.company?.province_name ?? null,
          city_municipality_code: companyResponse.company?.city_municipality_code ?? null,
          city_municipality_name: companyResponse.company?.city_municipality_name ?? companyResponse.company?.city ?? null,
          barangay_code: companyResponse.company?.barangay_code ?? null,
          barangay_name: companyResponse.company?.barangay_name ?? null,
          street_address: companyResponse.company?.street_address ?? companyResponse.company?.address ?? null,
          zip_code: companyResponse.company?.zip_code ?? null,
        },
      });
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

  useEffect(() => subscribeToUserUpdates((update) => {
    if (update.resource === "job_listings") void load();
  }), [load]);

  const visibleListings = useMemo(() => {
    if (filter === "Jobs") return listings.filter((listing) => listing.type === "Job");
    if (filter === "OJT") return listings.filter((listing) => listing.type === "OJT");
    return listings;
  }, [filter, listings]);
  const activeListingCount = listings.filter((listing) => listing.status === "active").length;
  const draftListingCount = listings.filter((listing) => listing.status === "draft").length;
  const modalTitle = editingListingId
    ? (newListingType === "ojt" ? "Edit OJT opportunity" : "Edit job listing")
    : (newListingType === "ojt" ? "Create a new OJT opportunity" : "Create a new job");
  const salaryRangeError = getSalaryRangeError(newListingForm);

  function openCreateModal() {
    setError(null);
    setEditingListingId(null);
    setNewListingType(null);
    setNewListingStep(1);
    setNewListingForm(emptyForm(companyProfile.location, companyProfile.locationAddress));
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setNewListingType(null);
    setNewListingStep(1);
    setEditingListingId(null);
  }

  function openEditModal(listing: EmployerListing) {
    setError(null);
    setEditingListingId(Number(listing.id));
    setNewListingType(listing.type === "OJT" ? "ojt" : "job");
    setNewListingStep(2);
    setNewListingForm({
      ...emptyForm(companyProfile.location, listing.locationAddress ?? emptyPhilippineAddress()),
      title: listing.title,
      categoryId: listing.categoryId ? String(listing.categoryId) : "",
      location: listing.location,
      latitude: listing.latitude ?? null,
      longitude: listing.longitude ?? null,
      workSetup: listing.workSetup ?? "hybrid",
      summary: listing.description,
      responsibilities: listing.responsibilities.join("\n"),
      requirements: listing.requirements ?? [],
      requiredSkills: listing.requiredSkills ?? [],
      employmentType: listing.employmentType ?? "full_time",
      experienceRequirement: listing.minimumExperienceYears ? "with_experience" : "without_experience",
      minimumExperienceYears: listing.minimumExperienceYears ? String(listing.minimumExperienceYears) : "1",
      salaryMin: listing.salaryMin !== null ? String(listing.salaryMin) : "",
      salaryMax: listing.salaryMax !== null ? String(listing.salaryMax) : "",
      applicantLimit: listing.applicantLimit ? String(listing.applicantLimit) : "25",
      availableSlots: listing.ojtSlots ? String(listing.ojtSlots) : "1",
      requiredHours: listing.ojtDurationHours ? String(listing.ojtDurationHours) : "480",
      allowanceType: listing.ojtAllowanceType ?? "paid",
      allowanceAmount: listing.ojtAllowanceAmount != null ? String(listing.ojtAllowanceAmount) : "",
      acceptedCourses: listing.acceptedCourses?.join(", ") ?? "",
      moaAccepted: listing.moaAccepted === false ? "false" : "true",
    });
    setIsCreateModalOpen(true);
  }

  function handleNewListingTypePick(type: "job" | "ojt") {
    setNewListingType(type);
    setNewListingStep(2);
  }

  function updateNewListingForm(
    field: Exclude<keyof NewListingFormState, "requirements" | "requiredSkills" | "locationAddress" | "latitude" | "longitude">,
    value: string,
  ) {
    if (field === "title" || field === "location" || field === "customCategoryName") {
      value = toNameCase(value);
    } else if (field === "summary" || field === "responsibilities") {
      value = capitalizeFirstLetter(value);
    }
    setNewListingForm((current) => ({ ...current, [field]: value }));
  }

  function updateNewListingAddress(locationAddress: PhilippineAddress) {
    setNewListingForm((current) => ({
      ...current,
      locationAddress,
      location: formatPhilippineAddressLabel(locationAddress),
      latitude: null,
      longitude: null,
    }));
  }

  function updateNewListingCoordinates(latitude: number | null, longitude: number | null) {
    setNewListingForm((current) => ({ ...current, latitude, longitude }));
  }

  function updateNewListingList(field: "requirements" | "requiredSkills", values: string[]) {
    setNewListingForm((current) => ({
      ...current,
      [field]: values.map((value) =>
        field === "requiredSkills" ? toNameCase(value) : capitalizeFirstLetter(value),
      ),
    }));
  }

  async function saveNewListing(publishAfterSaving: boolean) {
    if (!token || !newListingType) return;
    const hasDraftContent = Boolean(
      newListingForm.title.trim()
      || (newListingForm.categoryId && newListingForm.categoryId !== "other")
      || newListingForm.customCategoryName.trim()
      || (newListingForm.location.trim() && newListingForm.location !== companyProfile.location)
      || newListingForm.locationAddress.region_code
      || newListingForm.locationAddress.street_address
      || (newListingForm.latitude !== null && newListingForm.longitude !== null)
      || newListingForm.summary.trim()
      || newListingForm.responsibilities.trim()
      || newListingForm.requirements.length
      || newListingForm.requiredSkills.length
      || newListingForm.salaryMin
      || newListingForm.salaryMax
      || newListingForm.expiresAt
      || (newListingForm.applicantLimit && newListingForm.applicantLimit !== "25")
      || (newListingForm.availableSlots && newListingForm.availableSlots !== "1")
      || (newListingForm.requiredHours && newListingForm.requiredHours !== "480")
      || newListingForm.allowanceAmount
      || newListingForm.acceptedCourses.trim()
      || newListingForm.experienceRequirement === "with_experience"
      || newListingForm.employmentType !== "full_time"
      || newListingForm.workSetup !== "hybrid"
      || newListingForm.allowanceType !== "paid"
      || newListingForm.moaAccepted !== "true",
    );
    if (!publishAfterSaving && !hasDraftContent) {
      setError("Enter at least one listing detail before saving this draft.");
      return;
    }
    if (publishAfterSaving && (!newListingForm.title.trim()
      || (!newListingForm.categoryId && !newListingForm.customCategoryName.trim())
      || (newListingForm.categoryId === "other" && !newListingForm.customCategoryName.trim())
      || !newListingForm.summary.trim()
      || !newListingForm.responsibilities.trim() || !newListingForm.requirements.length
      || !newListingForm.location.trim()
      || !newListingForm.locationAddress.region_code
      || !newListingForm.locationAddress.city_municipality_code
      || (newListingForm.workSetup !== "remote"
        && (!newListingForm.locationAddress.barangay_code
          || !newListingForm.locationAddress.street_address?.trim())))) {
      setError("Complete the required listing details before saving.");
      return;
    }
    if (publishAfterSaving
      && newListingType === "job"
      && (newListingForm.salaryMin === "" || newListingForm.salaryMax === "")) {
      setError("Salary minimum and maximum are required before publishing this job listing.");
      return;
    }
    if (newListingType === "job" && salaryRangeError) {
      setError(salaryRangeError);
      return;
    }
    const numericError = getListingNumericError(newListingForm, newListingType);
    if (numericError) {
      setError(numericError);
      return;
    }
    if (newListingType === "job"
      && newListingForm.experienceRequirement === "with_experience"
      && (!/^\d+$/.test(newListingForm.minimumExperienceYears)
        || Number(newListingForm.minimumExperienceYears) < 1
        || Number(newListingForm.minimumExperienceYears) > 50)) {
      setError("Enter a minimum experience requirement between 1 and 50 years.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingListingId) {
        const response = await employerListingsApi.update(
          token,
          editingListingId,
          createPayload(newListingForm, newListingType, !publishAfterSaving),
        );
        let updated = toListing(response.data);
        if (publishAfterSaving && updated.status === "draft") {
          const publishResponse = await employerListingsApi.updateStatus(
            token,
            Number(updated.id),
            "open",
          );
          updated = toListing(publishResponse.listing);
        }
        setListings((current) =>
          current.map((listing) => listing.id === updated.id ? updated : listing),
        );
        closeCreateModal();
        window.dispatchEvent(new Event("careerconnect:employer-listings-changed"));
        return;
      }
      const response = await employerListingsApi.create(
        token,
        createPayload(newListingForm, newListingType, !publishAfterSaving),
      );
      const created = toListing(response.data);
      setListings((current) => [created, ...current]);
      window.dispatchEvent(new Event("careerconnect:employer-listings-changed"));
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
    const listing = listings.find((item) => item.id === id);
    if (status === "open"
      && listing?.type === "Job"
      && (typeof listing.salaryMin !== "number" || typeof listing.salaryMax !== "number")) {
      setError("Salary minimum and maximum are required before publishing this job listing.");
      return;
    }
    if (status === "open"
      && listing?.type === "Job"
      && typeof listing.salaryMin === "number"
      && typeof listing.salaryMax === "number"
      && listing.salaryMax < listing.salaryMin) {
      setError("Minimum salary cannot be higher than maximum salary.");
      return;
    }
    if (status === "closed") {
      setClosingListingId(Number(id));
      return;
    }
    setError(null);
    try {
      const response = await employerListingsApi.updateStatus(token, Number(id), status);
      const updated = toListing(response.listing);
      setListings((current) => current.map((listing) => listing.id === id ? updated : listing));
      window.dispatchEvent(new Event("careerconnect:employer-listings-changed"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update listing status.");
    }
  }

  async function confirmCloseListing() {
    if (closingListingId === null) return;
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await employerListingsApi.updateStatus(token, closingListingId, "closed");
      const updated = toListing(response.listing);
      setListings((current) => current.map((listing) => listing.id === String(closingListingId) ? updated : listing));
      window.dispatchEvent(new Event("careerconnect:employer-listings-changed"));
      setClosingListingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to close listing.");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    companyProfile,
    listings,
    visibleListings,
    categories,
    filter,
    setFilter,
    activeListingCount,
    draftListingCount,
    isCreateModalOpen,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    newListingType,
    handleNewListingTypePick,
    newListingStep,
    setNewListingStep,
    newListingForm,
    salaryRangeError,
    updateNewListingForm,
    updateNewListingAddress,
    updateNewListingCoordinates,
    updateNewListingList,
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
    closingListingId,
    setClosingListingId,
    confirmCloseListing,
  };
}
