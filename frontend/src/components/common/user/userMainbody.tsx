import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import isoCountries from "i18n-iso-countries";
import englishCountryNames from "i18n-iso-countries/langs/en.json";
import { useNavigate } from "react-router";
import { applicationStore } from "@/features/applications/applicationData";
import { onboardingStore } from "@/features/onboarding/store";
import { getJobMatch, textSimilarity } from "@/features/jobs/jobMatching";
import {
  getOjtMatch,
  type ScoredOjtOpportunity,
} from "@/features/jobs/ojtMatching";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";
import { jobListings } from "@/features/jobs/jobListings";
import { savedOpportunityStore } from "@/features/jobs/savedOpportunities";
import {
  LockedOjtFilters,
  OjtOpportunityCard,
} from "@/components/common/user/ojtOpportunityComponents";
import { ojtOpportunities } from "@/components/common/user/ojtOpportunityData";

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
  const [activeTab, setActiveTab] = useState("For you");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [selectedWorkSetup, setSelectedWorkSetup] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityList, setCityList] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const cityRequestId = useRef(0);
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const applicationSnapshot = useSyncExternalStore(
    applicationStore.subscribe,
    applicationStore.getSnapshot,
    applicationStore.getSnapshot,
  );
  const savedOpportunities = useSyncExternalStore(
    savedOpportunityStore.subscribe,
    savedOpportunityStore.getSnapshot,
    () => [],
  );
  const answers = onboarding.answers;
  const hasJobSeekerPreferences =
    onboarding.isComplete &&
    answers.goal === "job-seeker" &&
    (answers.desiredJobTitles.length > 0 ||
      answers.skills.length > 0 ||
      answers.jobCategories.length > 0 ||
      Boolean(answers.workSetup) ||
      answers.preferredLocations.length > 0);
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

  const visibleJobs = useMemo(() => {
    const matchingJobs = jobListings
      .map((job) => ({
        ...job,
        matchScore: hasJobSeekerPreferences
          ? getJobMatch(job, answers)?.score ?? null
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
            : !selectedCountryCode || job.countryCode === selectedCountryCode;
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
        const matchesTab =
          activeTab === "Jobs" || (audience === "job-seeker" && activeTab !== "OJT");
        return (
          matchesSearch &&
          matchesSaved &&
          matchesCountry &&
          matchesCity &&
          matchesCategory &&
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
    answers,
    audience,
    hasJobSeekerPreferences,
    search,
    selectedCategories,
    selectedCity,
    selectedCountryCode,
    savedOpportunities,
    showSavedOnly,
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
    (audience === "ojt-seeker" && activeTab !== "Jobs") ||
    (audience === "job-seeker" && activeTab === "OJT");
  const visibleOjtOpportunities = useMemo(() => {
    if (
      activeTab === "Jobs" ||
      (audience === "ojt-seeker" && !hasOjtPreferences) ||
      (audience === "job-seeker" && activeTab !== "OJT")
    ) {
      return [];
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
    return ojtOpportunities
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
    answers,
    audience,
    employmentTypes,
    hasOjtPreferences,
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
      const { default: cities } = await import("cities.json");
      if (requestId !== cityRequestId.current) return;

      setCityList(
        [
          ...new Set(
            cities
              .filter((city) => city.country === countryCode)
              .map((city) => city.name),
          ),
        ].sort((left, right) => left.localeCompare(right)),
      );
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
    <section className="mx-auto grid max-w-[1216px] grid-cols-[296px_minmax(0,1fr)] items-start gap-7 py-12 pb-[68px] max-[1300px]:mx-10 max-[920px]:mx-6 max-[920px]:grid-cols-[210px_minmax(0,1fr)] max-[920px]:gap-[18px] max-[680px]:mx-0 max-[680px]:block max-[680px]:px-4 max-[680px]:pt-[23px] max-[680px]:pb-[42px]" id="jobs">
      <aside className="rounded-[14px] border border-[#e9eeee] bg-white px-[18px] pt-5 pb-[18px] shadow-[0_3px_12px_rgba(47,77,76,0.025)] max-[920px]:px-[14px] max-[680px]:hidden">
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
                    ? "Loading city list..."
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
                <p className="px-3 py-2 text-[10px] text-[#849394]">
                  Loading cities...
                </p>
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
          <select className="h-[37px] w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[31px] pl-[11px] text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" id="setup-filter" defaultValue="Any setup">
            <option>Any setup</option>
            <option>Remote</option>
            <option>Hybrid</option>
            <option>On-site</option>
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
            {visibleOjtOpportunities.map((opportunity) => (
              <OjtOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
            {visibleOjtOpportunities.length === 0 && (
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
          </div>
        ) : (
        <div className="flex flex-col gap-[22px] max-[680px]:gap-[10px]">
          {visibleJobs.map((job) => (
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
                    <span className="font-semibold text-[#1b7776] max-[680px]:basis-full">{job.salary}</span>
                  </div>
                  <p className="my-2 text-[12px] leading-[1.45] text-[#748385]">{job.description}</p>
                  <div className="flex flex-wrap gap-[5px]">
                    {job.skills.map((skill) => <span className="rounded-[4px] bg-[#eff6f5] px-[7px] py-1 text-[12px] font-medium text-[#54797a] max-[680px]:text-[9px]" key={skill}>{skill}</span>)}
                  </div>
                  <div className="mt-[9px] flex items-center justify-between gap-3">
                    <div>
                      {applicationSnapshot.some(
                        (application) => application.jobListingId === job.id,
                      ) ? (
                        <span className="rounded-full bg-[#eaf6f3] px-2.5 py-1.5 text-[9px] font-semibold text-[#39817c]">
                          Applied
                        </span>
                      ) : null}
                    </div>
                    <span className="whitespace-nowrap text-[9px] text-[#9aa6a7]">{job.posted}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {visibleJobs.length === 0 ? (
            <div className="rounded-[13px] border border-dashed border-[#cadbda] bg-white px-5 py-[50px] text-center">
              <span className="inline-grid size-[42px] place-items-center rounded-[13px] bg-[#e6f4f1] text-[#188b8a]"><Icon name="search" size={22} /></span>
              <h3 className="mt-[14px] mb-[5px] text-[15px] text-[#203638]">No matching opportunities</h3>
              <p className="text-xs text-[#718184]">Try another job title, skill, or company.</p>
              <button className="mt-[14px] text-xs font-semibold text-[#087879] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" onClick={() => onSearchChange("")}>Clear search</button>
            </div>
          ) : null}
        </div>
        )}
      </div>
    </section>
  );
}
