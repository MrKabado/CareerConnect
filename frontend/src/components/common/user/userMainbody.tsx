import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import isoCountries from "i18n-iso-countries";
import { Skeleton } from "@/components/ui/skeleton";
import englishCountryNames from "i18n-iso-countries/langs/en.json";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { onboardingStore } from "@/features/onboarding/store";
import { getJobMatch, hasJobMatchingProfile, textSimilarity } from "@/features/jobs/jobMatching";
import type { JobListing } from "@/features/jobs/jobListings";
import { applicantFilesApi, type ApplicantProfileData } from "@/features/user-profile/backendApi";
import {
  applicantApplicationsApi,
  applicationStatusLabel,
  type ApplicantListingStatus,
} from "@/features/user-applications/backendApi";
import { getIdentityVerificationMessage } from "@/features/user-applications/identityVerification";
import {
  formatListingPay,
  listingText,
  publicJobsApi,
  type PublicJobListing,
} from "@/features/jobs/backendApi";
import {
  getOjtMatch,
  type OjtOpportunity,
  type ScoredOjtOpportunity,
} from "@/features/jobs/ojtMatching";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";
import JobDetailsModal from "@/components/features/jobsearch/JobDetailsModal";
import { savedOpportunityStore } from "@/features/jobs/savedOpportunities";
import { subscribeToPublicJobListings, subscribeToUserUpdates } from "@/lib/realtime";
import { loadCitiesForCountry } from "@/lib/cityData";
import {
  LockedOjtFilters,
  OjtOpportunityCard,
} from "@/components/common/user/ojtOpportunityComponents";

type ApiJobListing = JobListing & { listingId: number };

function apiWorkSetup(value: string): "onsite" | "hybrid" | "remote" | undefined {
  switch (value.toLowerCase()) {
    case "onsite":
    case "on-site":
      return "onsite";
    case "hybrid":
      return "hybrid";
    case "remote":
      return "remote";
    default:
      return undefined;
  }
}

function toFrontendListing(listing: PublicJobListing): ApiJobListing {
  const company = listing.company?.name ?? "Company unavailable";
  const publishedAt = listing.published_at ? new Date(listing.published_at) : null;
  const hoursSincePublished = publishedAt && !Number.isNaN(publishedAt.getTime())
    ? Math.max(0, Math.floor((Date.now() - publishedAt.getTime()) / 3_600_000))
    : 0;
  return {
    id: String(listing.id),
    listingId: listing.id,
    company,
    initials: company.slice(0, 1).toUpperCase(),
    title: listing.title,
    category: listing.category?.name ?? "Uncategorized",
    location: listing.location,
    latitude: listing.latitude,
    longitude: listing.longitude,
    countryCode: "",
    country: "",
    city: listing.company?.city ?? "",
    arrangement: listing.work_setup === "onsite"
      ? "On-site"
      : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
    employmentType: listing.employment_type
      ? ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract" } as const)[listing.employment_type]
      : listing.listing_type === "ojt" ? "Internship" : "Not specified",
    salary: formatListingPay(listing),
    salaryMin: listing.salary_min,
    salaryMax: listing.salary_max,
    posted: !publishedAt || Number.isNaN(publishedAt.getTime())
      ? "Date not available"
      : new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
          -Math.max(1, hoursSincePublished >= 24 ? Math.floor(hoursSincePublished / 24) : hoursSincePublished),
          hoursSincePublished >= 24 ? "day" : "hour",
        ),
    postedAt: listing.published_at,
    postedHoursAgo: hoursSincePublished,
    description: listing.description,
    responsibilities: listingText(listing.responsibilities),
    skills: listing.required_skills?.length
      ? listing.required_skills
      : listingText(listing.requirements),
    requirementsText: listingText(listing.requirements).join("\n"),
    requiredSkills: listing.required_skills ?? [],
    experienceRequired: listing.experience_required ?? false,
    minimumExperienceYears: listing.minimum_experience_years ?? null,
    applicantLimit: listing.applicant_limit ?? null,
    expiresAt: listing.expires_at ?? null,
  };
}

function formatListingPosted(publishedAt: string | null): string {
  if (!publishedAt) return "Date not available";
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "Date not available";
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3_600_000));
  const amount = hours >= 24 ? Math.max(1, Math.floor(hours / 24)) : Math.max(1, hours);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-amount, hours >= 24 ? "day" : "hour");
}

function formatStatusDate(value: string | null): string {
  if (!value) return "date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "date unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function getCooldownDaysRemaining(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function toOjtOpportunity(listing: PublicJobListing): OjtOpportunity {
  const company = listing.company?.name ?? "Company unavailable";
  return {
    id: String(listing.id),
    company,
    initials: company.slice(0, 1).toUpperCase(),
    title: listing.title,
    trainingFields: listing.category?.name ? [listing.category.name] : [],
    location: listing.location,
    city: listing.company?.city ?? "",
    countryCode: "",
    hoursCapacity: listing.ojt?.duration_hours ?? null,
    moaAvailable: listing.ojt?.moa_accepted ?? null,
    eligibleCourses: listing.ojt?.accepted_courses ?? [],
    workSetup: listing.work_setup === "onsite"
      ? "Onsite"
      : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
    employmentType: "Internship",
    allowance: listing.ojt?.allowance_type === "unpaid"
      ? "Unpaid"
      : listing.ojt?.allowance_amount == null
        ? ""
        : `₱${listing.ojt.allowance_amount.toLocaleString()} allowance`,
    skills: listingText(listing.requirements),
    posted: formatListingPosted(listing.published_at),
    description: listing.description,
  };
}
type IconName = "search" | "chevron" | "pin" | "briefcase" | "bookmark";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" /></>,
    bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

const jobCategories = [
  "Information Technology",
  "Customer Service / BPO",
  "Accounting & Finance",
  "Engineering",
  "Healthcare",
  "Education",
  "Sales & Marketing",
  "Design & Creative",
  "Administration",
  "Hospitality",
  "Human Resources",
  "Legal",
  "Operations & Logistics",
  "Manufacturing",
  "Science & Research",
  "Media & Communications",
  "Construction & Property",
  "Government & Public Service",
];

const cityResultLimit = 50;

isoCountries.registerLocale(englishCountryNames);

type MainBodyProps = {
  search: string;
  onSearchChange: (value: string) => void;
  audience: "job-seeker" | "ojt-seeker";
};

export default function MainBody({
  search,
  onSearchChange,
  audience,
}: MainBodyProps) {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("For you");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [viewedJobId, setViewedJobId] = useState<number | null>(null);
  const [selectedWorkSetup, setSelectedWorkSetup] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityList, setCityList] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [apiJobs, setApiJobs] = useState<ApiJobListing[]>([]);
  const [apiOjtOpportunities, setApiOjtOpportunities] = useState<OjtOpportunity[]>([]);
  const [profileResult, setProfileResult] = useState<{
    token: string;
    profile: ApplicantProfileData | null;
    error: string | null;
  } | null>(null);
  const [listingStatusesResult, setListingStatusesResult] = useState<{
    key: string;
    statuses: Record<number, ApplicantListingStatus>;
    error: string | null;
  } | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsLastPage, setJobsLastPage] = useState(1);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(false);
  const [ojtPage, setOjtPage] = useState(1);
  const [ojtLastPage, setOjtLastPage] = useState(1);
  const [loadingMoreOjt, setLoadingMoreOjt] = useState(false);
  const [jobRetry, setJobRetry] = useState(0);
  const [statusRetry, setStatusRetry] = useState(0);
  const cityRequestId = useRef(0);
  const jobsRequestId = useRef(0);
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const savedOpportunities = useSyncExternalStore(
    savedOpportunityStore.subscribe,
    savedOpportunityStore.getSnapshot,
    () => [],
  );
  const answers = onboarding.answers;
  const applicantProfile = token
    && audience === "job-seeker"
    && user?.role === "applicant"
    && profileResult?.token === token
    ? profileResult.profile
    : null;
  const profileError = token && profileResult?.token === token ? profileResult.error : null;
  const listingIds = useMemo(() => apiJobs.map((job) => job.listingId), [apiJobs]);
  const viewedJob = apiJobs.find((job) => job.listingId === viewedJobId) ?? null;
  const listingStatusKey = token
    && audience === "job-seeker"
    && user?.role === "applicant"
    && listingIds.length > 0
    ? `${token}:${listingIds.join(",")}`
    : null;
  const listingStatuses = listingStatusKey && listingStatusesResult?.key === listingStatusKey
    ? listingStatusesResult.statuses
    : {};
  const listingStatusesError = listingStatusKey && listingStatusesResult?.key === listingStatusKey
    ? listingStatusesResult.error
    : null;
  const identityVerificationStatus = user?.role === "applicant"
    ? user.identity_verification_status ?? "unverified"
    : null;
  const identityVerificationMessage = identityVerificationStatus
    ? getIdentityVerificationMessage(
        identityVerificationStatus,
        user?.role === "applicant" ? user.identity_verification_rejection_reason : null,
      )
    : null;
  const identityVerificationBlocksApplications =
    user?.role === "applicant" && identityVerificationStatus !== "verified";
  const hasJobSeekerPreferences =
    applicantProfile !== null
    && applicantProfile.looking_for_jobs
    && hasJobMatchingProfile(applicantProfile);
  const hasOjtPreferences =
    onboarding.isComplete &&
    answers.goal === "ojt-seeker" &&
    answers.trainingFields.length > 0 &&
    answers.preferredLocations.length > 0;
  const countries = useMemo(
    () =>
      Object.entries(isoCountries.getNames("en"))
        .map(([isoCode, name]) => ({ isoCode, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [],
  );
  const selectedCountry = countries.find(
    (country) => country.isoCode === selectedCountryCode,
  );
  const matchingCities = useMemo(() => {
    const query = citySearch.trim().toLocaleLowerCase();
    if (!query) return [];

    return cityList
      .filter((city) => city.toLocaleLowerCase().includes(query))
      .slice(0, cityResultLimit);
  }, [cityList, citySearch]);

  useEffect(() => {
    let active = true;
    if (!token || audience !== "job-seeker" || user?.role !== "applicant") return;

    void applicantFilesApi.profile(token)
      .then((response) => {
        if (!active) return;
        setProfileResult({ token, profile: response.data, error: null });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setProfileResult({
          token,
          profile: null,
          error: requestError instanceof Error
            ? requestError.message
            : "Unable to load your applicant profile for job matching.",
        });
      });

    return () => {
      active = false;
    };
  }, [audience, token, user?.role]);

  useEffect(() => {
    let active = true;
    if (!token || !listingStatusKey || listingIds.length === 0) return;

    void applicantApplicationsApi.listingStatuses(token, listingIds)
      .then((response) => {
        if (!active) return;
        setListingStatusesResult({
          key: listingStatusKey,
          statuses: Object.fromEntries(response.data.map((status) => [status.listing_id, status])),
          error: null,
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setListingStatusesResult({
          key: listingStatusKey,
          statuses: {},
          error: requestError instanceof Error
            ? requestError.message
            : "Unable to load your application status for these listings.",
        });
      });

    return () => {
      active = false;
    };
  }, [listingIds, listingStatusKey, statusRetry, token]);

  useEffect(() => subscribeToPublicJobListings(() => {
    setJobRetry((attempt) => attempt + 1);
  }), []);

  useEffect(() => {
    if (!token || audience !== "job-seeker" || user?.role !== "applicant") return;
    return subscribeToUserUpdates((update) => {
      if (update.resource === "applications") {
        setStatusRetry((attempt) => attempt + 1);
      }
    });
  }, [audience, token, user?.role]);

  useEffect(() => {
    const requestId = ++jobsRequestId.current;
    const timer = window.setTimeout(async () => {
      setJobsLoading(true);
      setJobsError(null);
      setApiJobs([]);
      setApiOjtOpportunities([]);
      setJobsPage(1);
      setJobsLastPage(1);
      setOjtPage(1);
      setOjtLastPage(1);
      try {
        const [response, ojtResponse] = await Promise.all([
          publicJobsApi.list({
          keyword: search.trim() || undefined,
          location: selectedCity || selectedCountry?.name || undefined,
          listing_type: "job",
          work_setup: apiWorkSetup(selectedWorkSetup),
          per_page: 50,
          page: 1,
          }),
          publicJobsApi.list({
            keyword: search.trim() || undefined,
            location: selectedCity || selectedCountry?.name || undefined,
            listing_type: "ojt",
            work_setup: apiWorkSetup(selectedWorkSetup),
            per_page: 50,
            page: 1,
          }),
        ]);
        if (requestId !== jobsRequestId.current) return;
        setApiJobs(Array.from(new Map(response.data.map((listing) => [listing.id, toFrontendListing(listing)])).values()));
        setApiOjtOpportunities(Array.from(new Map(ojtResponse.data.map((listing) => [listing.id, toOjtOpportunity(listing)])).values()));
        setJobsPage(response.meta.current_page);
        setJobsLastPage(response.meta.last_page);
        setOjtPage(ojtResponse.meta.current_page);
        setOjtLastPage(ojtResponse.meta.last_page);
      } catch (requestError) {
        if (requestId !== jobsRequestId.current) return;
        setJobsError(requestError instanceof Error ? requestError.message : "Unable to load current job listings.");
        setApiJobs([]);
        setApiOjtOpportunities([]);
      } finally {
        if (requestId === jobsRequestId.current) setJobsLoading(false);
      }
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [search, selectedCity, selectedCountry?.name, selectedWorkSetup, jobRetry]);

  async function loadMoreJobs() {
    if (loadingMoreJobs || jobsPage >= jobsLastPage) return;
    setLoadingMoreJobs(true);
    setJobsError(null);
    try {
      const response = await publicJobsApi.list({
        keyword: search.trim() || undefined,
        location: selectedCity || selectedCountry?.name || undefined,
        listing_type: "job",
        work_setup: apiWorkSetup(selectedWorkSetup),
        per_page: 50,
        page: jobsPage + 1,
      });
      setApiJobs((current) => Array.from(new Map([...current, ...response.data.map(toFrontendListing)].map((job) => [job.id, job])).values()));
      setJobsPage(response.meta.current_page);
      setJobsLastPage(response.meta.last_page);
    } catch (requestError) {
      setJobsError(requestError instanceof Error ? requestError.message : "Unable to load more listings.");
    } finally {
      setLoadingMoreJobs(false);
    }
  }

  async function loadMoreOjt() {
    if (loadingMoreOjt || ojtPage >= ojtLastPage) return;
    setLoadingMoreOjt(true);
    setJobsError(null);
    try {
      const response = await publicJobsApi.list({
        keyword: search.trim() || undefined,
        location: selectedCity || selectedCountry?.name || undefined,
        listing_type: "ojt",
        work_setup: apiWorkSetup(selectedWorkSetup),
        per_page: 50,
        page: ojtPage + 1,
      });
      setApiOjtOpportunities((current) =>
        Array.from(new Map([
          ...current,
          ...response.data.map(toOjtOpportunity),
        ].map((opportunity) => [opportunity.id, opportunity])).values()),
      );
      setOjtPage(response.meta.current_page);
      setOjtLastPage(response.meta.last_page);
    } catch (requestError) {
      setJobsError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load more OJT opportunities.",
      );
    } finally {
      setLoadingMoreOjt(false);
    }
  }

  const visibleJobs = useMemo(() => {
    const matchingJobs = apiJobs
      .map((job) => ({
        ...job,
        matchScore: hasJobSeekerPreferences && applicantProfile
          ? getJobMatch(job, applicantProfile)?.score ?? null
          : null,
      }))
      .filter((job) => {
        const matchesSearch =
          `${job.title} ${job.company} ${job.skills.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesSaved =
          !showSavedOnly || savedOpportunities.includes(`job:${job.id}`);
        const matchesCountry =
          audience === "ojt-seeker"
            ? answers.preferredLocations.length === 0 ||
              answers.preferredLocations.some(
                (location) =>
                  textSimilarity(location, job.location) > 0 ||
                  textSimilarity(location, job.city) > 0,
              )
            : !selectedCountryCode || `${job.location} ${job.city}`.toLowerCase().includes((selectedCountry?.name ?? "").toLowerCase());
        const matchesCity =
          audience === "ojt-seeker" ||
          !selectedCity ||
          !job.city ||
          job.city.toLocaleLowerCase().includes(selectedCity.toLocaleLowerCase()) ||
          selectedCity.toLocaleLowerCase().includes(job.city.toLocaleLowerCase());
        const matchesCategory =
          audience === "ojt-seeker"
            ? answers.trainingFields.length === 0 ||
              answers.trainingFields.some(
                (field) => textSimilarity(field, job.category) > 0,
              )
            : selectedCategories.length === 0 ||
              selectedCategories.includes(job.category);
        const matchesEmployment = employmentTypes.length === 0 ||
          employmentTypes.includes(job.employmentType);
        const matchesTab = activeTab !== "OJT";
        return (
          matchesSearch &&
          matchesSaved &&
          matchesCountry &&
          matchesCity &&
          matchesCategory &&
          matchesEmployment &&
          matchesTab
        );
      });

    if (activeTab === "For you" && hasJobSeekerPreferences) {
      matchingJobs.sort(
        (left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0),
      );
    }

    return matchingJobs;
  }, [
    activeTab,
    apiJobs,
    applicantProfile,
    answers,
    audience,
    hasJobSeekerPreferences,
    search,
    selectedCategories,
    selectedCity,
    selectedCountryCode,
    selectedCountry?.name,
    savedOpportunities,
    showSavedOnly,
    employmentTypes,
  ]);

  const bestMatch = visibleJobs.reduce<(typeof visibleJobs)[number] | null>(
    (best, job) =>
      job.matchScore !== null &&
      job.matchScore >= 70 &&
      (best === null || job.matchScore > (best.matchScore ?? 0))
        ? job
        : best,
    null,
  );
  const showOjtOpportunities =
    activeTab === "OJT";
  const visibleOjtOpportunities = useMemo(() => {
    if (activeTab === "Jobs") {
      return [];
    }

    if (activeTab === "OJT") {
      const query = search.trim().toLocaleLowerCase();
      return apiOjtOpportunities
        .filter((opportunity) => {
          const matchesSaved =
            !showSavedOnly || savedOpportunities.includes(`ojt:${opportunity.id}`);
          const matchesWorkSetup =
            !selectedWorkSetup ||
            opportunity.workSetup.toLowerCase() === selectedWorkSetup.toLowerCase();
          const matchesEmployment =
            employmentTypes.length === 0 ||
            employmentTypes.includes(opportunity.employmentType);
          const matchesSearch =
            !query ||
            `${opportunity.title} ${opportunity.company} ${opportunity.skills.join(" ")}`
              .toLocaleLowerCase()
              .includes(query);
          return matchesSaved && matchesWorkSetup && matchesEmployment && matchesSearch;
        })
        .map((opportunity) => ({
          ...opportunity,
          matchScore: 100,
          requiredHours: null,
        }))
        .sort((left, right) => left.title.localeCompare(right.title));
    }

    const ojtAnswers =
      audience === "job-seeker"
        ? {
            ...answers,
            course: answers.course || "BS Information Technology",
            requiredOjtHours: answers.requiredOjtHours || "480",
            trainingFields:
              answers.trainingFields.length > 0
                ? answers.trainingFields
                : [
                    "Information Technology",
                    "Software Engineering",
                    "Design & Creative",
                  ],
            preferredLocations:
              answers.preferredLocations.length > 0
                ? answers.preferredLocations
                : ["Taguig City"],
          }
        : answers;

    const query = search.trim().toLocaleLowerCase();
    return apiOjtOpportunities
      .map((opportunity) => getOjtMatch(opportunity, ojtAnswers))
      .filter(
        (opportunity): opportunity is ScoredOjtOpportunity =>
          opportunity !== null &&
          (!showSavedOnly || savedOpportunities.includes(`ojt:${opportunity.id}`)) &&
          (!selectedWorkSetup ||
            opportunity.workSetup.toLowerCase() ===
              selectedWorkSetup.toLowerCase()) &&
          (employmentTypes.length === 0 ||
            employmentTypes.includes(opportunity.employmentType)) &&
          (!query ||
            `${opportunity.title} ${opportunity.company} ${opportunity.skills.join(" ")}`
              .toLocaleLowerCase()
              .includes(query)),
      )
      .sort((left, right) => right.matchScore - left.matchScore);
  }, [
    activeTab,
    apiOjtOpportunities,
    answers,
    audience,
    employmentTypes,
    search,
    savedOpportunities,
    showSavedOnly,
    selectedWorkSetup,
  ]);

  function toggleEmploymentType(type: string) {
    setEmploymentTypes((selected) => selected.includes(type)
      ? selected.filter((item) => item !== type)
      : [...selected, type]);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((selected) =>
      selected.includes(category)
        ? selected.filter((item) => item !== category)
        : [...selected, category],
    );
  }

  function clearFilters() {
    cityRequestId.current += 1;
    onSearchChange("");
    setEmploymentTypes([]);
    setSelectedWorkSetup("");
    setSelectedCountryCode("");
    setSelectedCity("");
    setCitySearch("");
    setCityList([]);
    setIsLoadingCities(false);
    setCityLoadError(null);
    setSelectedCategories([]);
  }

  async function handleCountryChange(countryCode: string) {
    const requestId = ++cityRequestId.current;
    setSelectedCountryCode(countryCode);
    setSelectedCity("");
    setCitySearch("");
    setCityList([]);
    setCityLoadError(null);
    setIsCityMenuOpen(false);

    if (!countryCode) {
      setIsLoadingCities(false);
      return;
    }

    setIsLoadingCities(true);
    try {
      const cities = await loadCitiesForCountry(countryCode);
      if (requestId !== cityRequestId.current) return;
      setCityList(cities);
    } catch (error) {
      if (requestId !== cityRequestId.current) return;

      setCityLoadError(
        error instanceof Error ? error.message : "Unable to load cities.",
      );
    } finally {
      if (requestId === cityRequestId.current) setIsLoadingCities(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-[1136px] grid-cols-[296px_minmax(0,1fr)] items-start gap-7 py-12 pb-[68px] max-[1300px]:mx-[max(40px,calc((100vw-1136px)/2))] max-[920px]:mx-6 max-[920px]:grid-cols-[210px_minmax(0,1fr)] max-[920px]:gap-[18px] max-[680px]:mx-0 max-[680px]:block max-[680px]:px-4 max-[680px]:pt-[23px] max-[680px]:pb-[42px]" id="jobs">
      <aside className="rounded-[14px] border border-[#e9eeee] bg-white px-[18px] pt-5 pb-[18px] shadow-[0_3px_12px_rgba(47,77,76,0.025)] max-[920px]:px-[14px] max-[680px]:mb-4 max-[680px]:max-h-96 max-[680px]:overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.35px] text-[#293d3e]">Filters</h2>
          <button className="py-1 text-[11px] font-semibold text-[#098487] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" onClick={clearFilters}>Clear all</button>
        </div>
        {audience === "ojt-seeker" ? (
          <LockedOjtFilters
            categories={answers.trainingFields}
            locations={answers.preferredLocations}
          />
        ) : (
          <>
        <label className="mb-2 block text-[11px] font-medium text-[#718184]" htmlFor="country-filter">Country</label>
        <div className="relative mb-3 flex items-center">
          <select
            className="h-[37px] w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[31px] pl-[11px] text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
            id="country-filter"
            onChange={(event) => void handleCountryChange(event.target.value)}
            value={selectedCountryCode}
          >
            <option value="">Any country</option>
            {countries.map((country) => (
              <option key={country.isoCode} value={country.isoCode}>
                {country.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-[10px] text-[#849394]"><Icon name="chevron" size={15} /></span>
        </div>
        <label className="mb-2 block text-[11px] font-medium text-[#718184]" htmlFor="city-filter">City</label>
        <div className="relative mb-[17px]">
          <div className="flex h-[37px] items-center rounded-lg border border-[#e5ebeb] bg-white px-[11px] focus-within:border-[#078b8d] focus-within:ring-3 focus-within:ring-[#078b8d]/10">
            <input
              aria-autocomplete="list"
              aria-controls="city-filter-options"
              aria-expanded={isCityMenuOpen}
              aria-label="Search cities"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-[#526466] outline-none placeholder:text-[#9aa7a7] disabled:cursor-not-allowed"
              disabled={!selectedCountryCode || isLoadingCities || Boolean(cityLoadError)}
              id="city-filter"
              onChange={(event) => {
                setCitySearch(event.target.value);
                setSelectedCity("");
                setIsCityMenuOpen(true);
              }}
              onFocus={() => setIsCityMenuOpen(true)}
              placeholder={
                !selectedCountryCode
                  ? "Choose a country first"
                  : isLoadingCities
                    ? "Searching cities"
                    : "Search for a city"
              }
              role="combobox"
              value={selectedCity || citySearch}
            />
            {(selectedCity || citySearch) && (
              <button
                aria-label="Clear selected city"
                className="ml-2 text-sm text-[#849394] hover:text-[#078b8d]"
                onClick={() => {
                  setSelectedCity("");
                  setCitySearch("");
                  setIsCityMenuOpen(false);
                }}
                type="button"
              >
                ×
              </button>
            )}
          </div>
          {cityLoadError && (
            <p className="mt-1 text-[10px] text-[#b34b4b]" role="alert">
              Could not load cities: {cityLoadError}
            </p>
          )}
          {selectedCountryCode && !cityLoadError && (
            <p className="mt-1 text-[9px] text-[#9aa7a7]">
              City data ©{" "}
              <a
                className="underline hover:text-[#078b8d]"
                href="https://www.geonames.org/"
                rel="noreferrer"
                target="_blank"
              >
                GeoNames
              </a>{" "}
              ·{" "}
              <a
                className="underline hover:text-[#078b8d]"
                href="https://creativecommons.org/licenses/by/4.0/"
                rel="noreferrer"
                target="_blank"
              >
                CC BY 4.0
              </a>
            </p>
          )}
          {selectedCountryCode && isCityMenuOpen && !cityLoadError && (
            <div
              className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#e5ebeb] bg-white py-1 shadow-lg"
              id="city-filter-options"
              role="listbox"
            >
              {isLoadingCities ? (
                <div aria-busy="true" aria-live="polite" className="space-y-2 px-3 py-2">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-3 w-28 rounded-full" />
                </div>
              ) : !citySearch.trim() ? (
                <p className="px-3 py-2 text-[10px] leading-4 text-[#849394]">
                  Search {cityList.length.toLocaleString()} cities in{" "}
                  {selectedCountry?.name}.
                </p>
              ) : matchingCities.length > 0 ? (
                <>
                  {matchingCities.map((city) => (
                    <button
                      aria-selected={selectedCity === city}
                      className="block w-full px-3 py-2 text-left text-[11px] text-[#526466] hover:bg-[#eff9f7] hover:text-[#087f78]"
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setCitySearch("");
                        setIsCityMenuOpen(false);
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      role="option"
                      type="button"
                    >
                      {city}
                    </button>
                  ))}
                  {matchingCities.length === cityResultLimit && (
                    <p className="px-3 py-2 text-[9px] text-[#849394]">
                      Showing the first {cityResultLimit} matches. Refine your search.
                    </p>
                  )}
                </>
              ) : (
                <p className="px-3 py-2 text-[10px] text-[#849394]">
                  No city found. Try a different search.
                </p>
              )}
            </div>
          )}
        </div>
        <fieldset className="mb-[17px] border-0 p-0">
          <legend className="mb-2 w-full text-[11px] font-medium text-[#718184]">
            Categories
            {selectedCategories.length > 0 && (
              <span className="ml-1 text-[#078b8d]">
                ({selectedCategories.length} selected)
              </span>
            )}
          </legend>
          <div className="max-h-44 space-y-[9px] overflow-y-auto pr-1">
            {jobCategories.map((category) => (
              <label className="flex cursor-pointer items-start gap-2 text-[11px] text-[#596b6d]" key={category}>
                <input
                  checked={selectedCategories.includes(category)}
                  className="mt-0.5 size-[14px] shrink-0 accent-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
                  onChange={() => toggleCategory(category)}
                  type="checkbox"
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mb-2 block text-[11px] font-medium text-[#718184]" htmlFor="setup-filter">Work setup</label>
        <div className="relative mb-[17px] flex items-center">
          <select className="h-[37px] w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[31px] pl-[11px] text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" id="setup-filter" onChange={(event) => setSelectedWorkSetup(event.target.value)} value={selectedWorkSetup || "Any setup"}>
            <option value="Any setup">Any setup</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
          <span className="pointer-events-none absolute right-[10px] text-[#849394]"><Icon name="chevron" size={15} /></span>
        </div>
        <fieldset className="mt-5 flex flex-col gap-[11px] border-0 p-0">
          <legend className="mb-[5px] w-full text-[11px] font-semibold text-[#66787a]">Employment type</legend>
          {["Full-time", "Part-time", "Contract", "Internship"].map((option) => (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#596b6d]" key={option}>
              <input className="m-0 size-[14px] accent-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" type="checkbox" checked={employmentTypes.includes(option)} onChange={() => toggleEmploymentType(option)} />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
          </>
        )}
        {audience === "ojt-seeker" && (
          <div className="mt-5 border-t border-[#edf1f1] pt-4">
            <label
              className="mb-2 block text-[11px] font-medium text-[#718184]"
              htmlFor="ojt-work-setup-filter"
            >
              Work setup
            </label>
            <div className="relative mb-[17px] flex items-center">
              <select
                className="h-[37px] w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[31px] pl-[11px] text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
                id="ojt-work-setup-filter"
                onChange={(event) => setSelectedWorkSetup(event.target.value)}
                value={selectedWorkSetup}
              >
                <option value="">Any setup</option>
                <option value="Onsite">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
              <span className="pointer-events-none absolute right-[10px] text-[#849394]"><Icon name="chevron" size={15} /></span>
            </div>
            <fieldset className="flex flex-col gap-[11px] border-0 p-0">
              <legend className="mb-[5px] w-full text-[11px] font-semibold text-[#66787a]">
                Employment type
              </legend>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#596b6d]">
                <input
                  checked={employmentTypes.includes("Internship")}
                  className="m-0 size-[14px] accent-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
                  onChange={() => toggleEmploymentType("Internship")}
                  type="checkbox"
                />
                <span>Internship</span>
              </label>
            </fieldset>
          </div>
        )}
      </aside>

      <div className="min-w-0">
        {user?.role === "applicant" && (
          <div
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              identityVerificationStatus === "verified"
                ? "border-[#d6ebe4] bg-[#f0f8f5] text-[#247b63]"
                : "border-[#eadfc5] bg-[#fffbf1] text-[#765b24]"
            }`}
            role={identityVerificationStatus === "verified" ? "status" : "alert"}
          >
            <div>
              <p className="text-xs font-semibold">
                {identityVerificationStatus === "verified"
                  ? "Identity verified"
                  : identityVerificationStatus === "pending"
                    ? "Identity verification pending"
                    : identityVerificationStatus === "rejected"
                      ? "Identity verification needs attention"
                      : "Identity verification required"}
              </p>
              {identityVerificationMessage && (
                <p className="mt-1 text-[11px] leading-5">{identityVerificationMessage}</p>
              )}
            </div>
            {identityVerificationStatus !== "verified" && (
              <button
                className="rounded-lg border border-current px-3 py-1.5 text-[10px] font-semibold hover:bg-white/70"
                onClick={() => navigate("/profile")}
                type="button"
              >
                {identityVerificationStatus === "pending" ? "View status" : "Verify identity"}
              </button>
            )}
          </div>
        )}
        <div className="flex min-h-[54px] items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-[-0.35px] text-[#293d3e] max-[680px]:text-[17px]">
              {showOjtOpportunities
                ? audience === "job-seeker" || activeTab === "OJT"
                  ? "OJT opportunities"
                  : "Opportunities for you"
                : "Job opportunities"}
            </h2>
            <p className="mt-[5px] text-[11px] text-[#8a999a] max-[680px]:text-[10px]">
                {showOjtOpportunities
                  ? `${visibleOjtOpportunities.length} OJT roles matched to your profile`
                  : `${visibleJobs.length} roles available`}
            </p>
            {audience === "job-seeker" && !hasJobSeekerPreferences && (
              <p className="mt-1 text-[10px] text-[#8a999a]">
                Complete your job-seeker profile to see personalized match percentages.
              </p>
            )}
            {audience === "ojt-seeker" && !hasOjtPreferences && (
              <p className="mt-1 text-[10px] text-[#8a999a]">
                Complete OJT onboarding to get recommendations matched to your location and training fields.
              </p>
            )}
          </div>
          <label className="relative flex w-[142px] flex-none items-center max-[680px]:w-28">
            <span className="sr-only">Sort opportunities</span>
            <select className="h-9 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[29px] pl-3 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] max-[680px]:h-[34px] max-[680px]:py-0 max-[680px]:pr-[29px] max-[680px]:pl-[9px] max-[680px]:text-[10px]" defaultValue="Most recent">
              <option>Most recent</option>
              <option>Salary: high to low</option>
            </select>
            <span className="pointer-events-none absolute right-[10px] text-[#849394]"><Icon name="chevron" size={15} /></span>
          </label>
        </div>

        <div className="my-5 flex items-center justify-between max-[680px]:mt-[13px]">
          <div className="inline-flex items-center rounded-[9px] bg-[#e9f0ef] p-[3px]" role="tablist" aria-label="Opportunity type">
            {["For you", "Jobs", "OJT"].map((tab) => (
              <button key={tab} className={`min-w-[52px] rounded-[7px] px-[13px] py-2 text-[11px] font-semibold focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${activeTab === tab ? "bg-[#0b8b8e] text-white shadow-[0_2px_5px_rgba(7,91,94,0.17)]" : "text-[#6b7e80]"}`} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <button
            aria-pressed={showSavedOnly}
            className={`inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[10px] font-semibold focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${
              showSavedOnly
                ? "border-[#9ed2aa] bg-[#eaf6ed] text-[#237a42]"
                : "border-[#e2eaea] bg-white text-[#66787a] hover:border-[#b9ddda] hover:text-[#078789]"
            }`}
            onClick={() => setShowSavedOnly((savedOnly) => !savedOnly)}
            type="button"
          >
            <Icon name="bookmark" size={14} />
            Saved ({savedOpportunities.length})
          </button>
          <span className="hidden text-[11px] text-[#718184] max-[680px]:inline">
            {showOjtOpportunities
              ? visibleOjtOpportunities.length
              : visibleJobs.length}{" "}
            results
          </span>
        </div>

        {showOjtOpportunities ? (
          <div className="flex flex-col gap-[10px]">
            {jobsError && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
                <span>{jobsError}</span>
                <button className="font-semibold underline" onClick={() => setJobRetry((attempt) => attempt + 1)} type="button">Try again</button>
              </div>
            )}
            {jobsLoading && (
              <p aria-live="polite" className="rounded-xl border border-[#e5efed] bg-white px-4 py-5 text-center text-xs text-[#718184]">
                Loading current OJT listings…
              </p>
            )}
            {visibleOjtOpportunities.map((opportunity) => (
              <OjtOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
            {visibleOjtOpportunities.length === 0 && !jobsLoading && !jobsError && (
              <div className="rounded-[13px] border border-dashed border-[#cadbda] bg-white px-5 py-[50px] text-center">
                <h3 className="text-[15px] font-semibold text-[#203638]">
                  {audience === "ojt-seeker" && !hasOjtPreferences
                    ? "Your OJT recommendations are not ready yet"
                    : "No matching OJT opportunities"}
                </h3>
                <p className="mt-1 text-xs text-[#718184]">
                  {audience === "ojt-seeker" && !hasOjtPreferences
                    ? "Complete OJT onboarding to see opportunities matched to your training field and preferred location."
                    : "Try a different search, or update your OJT preferences to explore other matches."}
                </p>
              </div>
            )}
            {ojtPage < ojtLastPage && (
              <div className="text-center">
                <button
                  className="rounded-lg border border-[#dcebea] bg-white px-4 py-2 text-xs font-semibold text-[#16878b] disabled:opacity-50"
                  disabled={loadingMoreOjt}
                  onClick={() => void loadMoreOjt()}
                  type="button"
                >
                  {loadingMoreOjt ? "Loading…" : "Load more OJT opportunities"}
                </button>
              </div>
            )}
          </div>
        ) : (
        <div className="flex flex-col gap-[22px] max-[680px]:gap-[10px]">
          {profileError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
              Job match percentages are unavailable: {profileError}
            </p>
          )}
          {listingStatusesError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
              Application status could not be loaded: {listingStatusesError}
            </p>
          )}
          {jobsError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
              <span>{jobsError}</span>
              <button
                className="font-semibold underline"
                onClick={() => {
                  setJobsError(null);
                  setJobRetry((attempt) => attempt + 1);
                }}
                type="button"
              >
                Try again
              </button>
            </div>
          )}
          {jobsLoading && (
            <p aria-live="polite" className="rounded-xl border border-[#e5efed] bg-white px-4 py-5 text-center text-xs text-[#718184]">
              Loading current listings…
            </p>
          )}
          {activeTab === "For you" && visibleOjtOpportunities.map((opportunity) => (
            <OjtOpportunityCard
              key={`for-you-${opportunity.id}`}
              opportunity={opportunity}
            />
          ))}
          {visibleJobs.map((job) => {
            const applicationStatus = listingStatuses[job.listingId];
            const isRejected = applicationStatus?.status === "rejected";
            const cooldownDays = isRejected
              ? getCooldownDaysRemaining(applicationStatus?.reapply_available_at ?? null)
              : 0;
            const isCooldownActive = Boolean(isRejected && applicationStatus && !applicationStatus.reapplication_allowed);
            const hasActiveApplication = applicationStatus !== undefined && !isRejected;

            return (
            <article
              aria-label={`View ${job.company} company profile`}
              className={`cursor-pointer overflow-hidden rounded-[13px] border bg-white shadow-[0_3px_10px_rgba(39,85,82,0.025)] transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-[#b9dcda] hover:shadow-[0_7px_18px_rgba(39,85,82,0.07)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${bestMatch?.id === job.id ? "border-[#078b8d] ring-2 ring-[#078b8d]/10" : "border-[#dcebea]"}`}
              key={job.id}
              onClick={() => navigate(getCompanyProfileUrl(job.company))}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  navigate(getCompanyProfileUrl(job.company));
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div className="flex items-start gap-3 px-[17px] py-[22px] max-[680px]:gap-[10px] max-[680px]:p-[13px_12px]">
                <div className="grid size-[42px] flex-none place-items-center rounded-[10px] border border-[#e5efed] bg-[#078b8d] text-[18px] font-bold text-white max-[680px]:size-[34px] max-[680px]:rounded-[9px]">{job.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-[14px]">
                    <div className="min-w-0">
                      {bestMatch?.id === job.id && (
                        <span className="mb-1 inline-flex rounded-full bg-[#e6f7f3] px-2 py-1 text-[9px] font-semibold text-[#087f78]">
                          Best match
                        </span>
                      )}
                      <h3 className="text-[20px] font-bold tracking-[-0.15px] text-[#2b3e3f]">{job.title}</h3>
                      <p className="mt-1 text-[15px] font-medium text-[#647779]">{job.company}</p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      {job.matchScore !== null && (
                        <span
                          aria-label={`${job.matchScore}% profile match`}
                          className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold ${bestMatch?.id === job.id ? "bg-[#e6f7f3] text-[#087f78]" : "bg-[#eff6f5] text-[#54797a]"}`}
                        >
                          {job.matchScore}% match
                        </span>
                      )}
                      <button className={`inline-flex size-[22px] flex-none items-center justify-center rounded border border-transparent text-[#859596] hover:border-[#b9ddda] hover:bg-[#eff9f7] hover:text-[#078789] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${savedOpportunityStore.isSaved("job", job.id) ? "border-[#9ed2aa] bg-[#eaf6ed] text-[#27834b] [&_svg]:fill-[#bfe7c8]" : ""}`} aria-label={savedOpportunityStore.isSaved("job", job.id) ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} aria-pressed={savedOpportunityStore.isSaved("job", job.id)} onClick={(event) => { event.stopPropagation(); savedOpportunityStore.toggle("job", job.id); }}>
                        <Icon name="bookmark" size={19} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-[7px] text-[13px] text-[#778789] max-[680px]:text-[9px]">
                    <span className="inline-flex items-center gap-1"><Icon name="pin" size={15} />{job.location}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="briefcase" size={15} />{job.arrangement}</span>
                    <span>{job.experienceRequired ? `At least ${job.minimumExperienceYears ?? 1} years experience` : "No experience required"}</span>
                    <span className="font-semibold text-[#1b7776] max-[680px]:basis-full">{job.salary}</span>
                  </div>
                  <p className="my-2 text-[12px] leading-[1.45] text-[#748385]">{job.description}</p>
                  {applicationStatus && (
                    <div className={`mb-2 rounded-lg border px-3 py-2 text-[10px] ${isRejected ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#dcebea] bg-[#f5f9f8] text-[#526c6e]"}`}>
                      <p className="font-semibold">
                        {isRejected ? "Previously rejected for this listing" : `Application ${applicationStatusLabel(applicationStatus.status).toLowerCase()}`}
                      </p>
                      {isRejected ? (
                        <p className="mt-1">
                          Rejected on {formatStatusDate(applicationStatus.rejected_at)}.
                          {isCooldownActive
                            ? ` You can apply again on ${formatStatusDate(applicationStatus.reapply_available_at)}${cooldownDays > 0 ? ` (${cooldownDays} ${cooldownDays === 1 ? "day" : "days"} remaining)` : ""}.`
                            : " The 30-day restriction has ended; you may apply again."}
                        </p>
                      ) : (
                        <p className="mt-1">You already have an application for this specific listing.</p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-[5px]">
                    {job.skills.map((skill) => <span className="rounded-[4px] bg-[#eff6f5] px-[7px] py-1 text-[12px] font-medium text-[#54797a] max-[680px]:text-[9px]" key={skill}>{skill}</span>)}
                  </div>
                  <div className="mt-[9px] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-lg bg-[#078b8d] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#067476] disabled:cursor-not-allowed disabled:bg-[#9aa6a7]"
                        aria-describedby={identityVerificationBlocksApplications
                          ? `identity-application-notice-${job.listingId}`
                          : undefined}
                        disabled={identityVerificationBlocksApplications || hasActiveApplication || isCooldownActive}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/apply/${job.listingId}`);
                        }}
                        type="button"
                      >
                        {hasActiveApplication
                            ? "Applied"
                            : isCooldownActive
                              ? "Reapply unavailable"
                              : "Apply"}
                      </button>
                      <button
                        className="rounded-lg border border-[#078b8d] px-3 py-1.5 text-[10px] font-semibold text-[#078b8d] hover:bg-[#eff9f7]"
                        aria-label={`View details for ${job.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewedJobId(job.listingId);
                        }}
                        type="button"
                      >
                        View details
                      </button>
                      {identityVerificationBlocksApplications && (
                        <span className="max-w-56 text-[9px] text-[#758687]" id={`identity-application-notice-${job.listingId}`}>
                          {identityVerificationMessage}
                        </span>
                      )}
                      <span className="whitespace-nowrap text-[9px] text-[#9aa6a7]">{job.posted}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            );
          })}
          {visibleJobs.length === 0 && !jobsLoading && !jobsError ? (
            <div className="rounded-[13px] border border-dashed border-[#cadbda] bg-white px-5 py-[50px] text-center">
              <span className="inline-grid size-[42px] place-items-center rounded-[13px] bg-[#e6f4f1] text-[#188b8a]"><Icon name="search" size={22} /></span>
              <h3 className="mt-[14px] mb-[5px] text-[15px] text-[#203638]">No matching opportunities</h3>
              <p className="text-xs text-[#718184]">Try another job title, skill, or company.</p>
              <button className="mt-[14px] text-xs font-semibold text-[#087879] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" onClick={() => onSearchChange("")}>Clear search</button>
            </div>
          ) : null}
          {jobsPage < jobsLastPage && (
            <div className="text-center">
              <button
                className="rounded-lg border border-[#dcebea] bg-white px-4 py-2 text-xs font-semibold text-[#16878b] disabled:opacity-50"
                disabled={loadingMoreJobs}
                onClick={() => void loadMoreJobs()}
                type="button"
              >
                {loadingMoreJobs ? "Loading…" : "Load more jobs"}
              </button>
            </div>
          )}
        </div>
        )}
      </div>
      <JobDetailsModal listing={viewedJob} onClose={() => setViewedJobId(null)} />
    </section>
  );
}
