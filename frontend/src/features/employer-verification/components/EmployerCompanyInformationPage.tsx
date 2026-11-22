import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useAuth } from "@/features/auth/useAuth";
import { apiRequest } from "@/lib/axios";
import isoCountries from "i18n-iso-countries";
import englishCountryNames from "i18n-iso-countries/langs/en.json";
import { loadCitiesForCountry } from "@/lib/cityData";
import { employerCompanySizes } from "@/features/employer-registration/types";
import {
  companyVerificationApi,
  isCompanyVerificationInformationComplete,
} from "@/features/company-verification/api";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";
import type {
  CompanyEntityType,
  CompanyVerificationInformation,
} from "@/features/company-verification/types";

isoCountries.registerLocale(englishCountryNames);

const countryNames = isoCountries.getNames("en");
const countryOptions = Object.entries(countryNames)
  .map(([code, name]) => ({ code, name }))
  .sort((left, right) => left.name.localeCompare(right.name));

const entityTypes: Array<{ value: CompanyEntityType; label: string }> = [
  { value: "sole_proprietor", label: "Sole proprietor" },
  { value: "company", label: "Company" },
  { value: "agency_recruiter", label: "Agency or recruiter" },
  { value: "public_or_nonprofit", label: "Public or nonprofit organization" },
];

const inputClassName =
  "w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15";

function normalizeCountryCode(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";
  const code = normalized.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(countryNames, code)) return code;

  return countryOptions.find(
    (country) => country.name.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  )?.code ?? "";
}

function normalizeCompanySize(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";
  return employerCompanySizes.find(
    (size) => size.value === normalized || size.label === normalized,
  )?.value ?? normalized;
}

function sanitizePhoneInput(value: string): string {
  return value
    .replace(/[^\d+().\s-]/g, "")
    .replace(/(?!^)\+/g, "");
}

function isValidPhoneNumber(value: string): boolean {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  let depth = 0;
  let parenthesesValid = true;
  for (const character of phone) {
    if (character === "(") {
      if (depth !== 0) parenthesesValid = false;
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) parenthesesValid = false;
    }
  }
  parenthesesValid = parenthesesValid && depth === 0 && !/\(\s*\)/.test(phone);

  return (
    /^\+?[0-9][0-9\s().-]*[0-9]$/.test(phone) &&
    digits.length >= 7 &&
    digits.length <= 15 &&
    parenthesesValid
  );
}

export default function EmployerCompanyInformationPage() {
  const { employer } = useEmployerStatus();
  const { user, token } = useAuth();
  const { record } = useCompanyVerification();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [otherIndustry, setOtherIndustry] = useState("");
  const [philippineCities, setPhilippineCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [information, setInformation] = useState<CompanyVerificationInformation>(
    () => ({
      legalName: record.companyInformation?.legalName ?? employer?.companyName ?? "",
      country: normalizeCountryCode(record.companyInformation?.country),
      entityType: record.companyInformation?.entityType ?? "company",
      registrationNumber: record.companyInformation?.registrationNumber ?? "",
      website: record.companyInformation?.website ?? employer?.website ?? "",
      industry: record.companyInformation?.industry ?? employer?.industry ?? "",
      teamSize: normalizeCompanySize(
        record.companyInformation?.teamSize ?? employer?.companySize,
      ),
      userRole: record.companyInformation?.userRole ?? employer?.companyRole ?? "",
      overview: record.companyInformation?.overview ?? "",
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const companySizeLabel =
    employerCompanySizes.find((size) => size.value === information.teamSize)?.label ??
    information.teamSize;

  useEffect(() => {
    if (information.country !== "PH") return;

    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return [];
        setIsLoadingCities(true);
        setCityLoadError(null);
        return loadCitiesForCountry("PH");
      })
      .then((cities) => {
        if (active) setPhilippineCities(cities);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setCityLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load Philippine cities.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [information.country]);

  useEffect(() => {
    if (!token || user?.role !== "employer") return;

    let active = true;
    Promise.all([
      employerCompanyApi.company(token),
      employerCompanyApi.categories(),
    ])
      .then(([company, categoryResponse]) => {
        if (!active) return;
        const savedCompany = company.company;
        setCategories(categoryResponse.data);
        if (!savedCompany) return;
        setCategoryId(savedCompany.category_id ? String(savedCompany.category_id) : "");
        if (!savedCompany.category_id && savedCompany.industry) {
          setCategoryId("other");
          setOtherIndustry(savedCompany.industry);
        }
        setAddress(savedCompany.address ?? "");
        setCity(savedCompany.city ?? "");
        setContactPhone(savedCompany.contact_phone ?? "");
        setInformation((current) => ({
          ...current,
          legalName: savedCompany.name,
          country: normalizeCountryCode(savedCompany.country) || current.country,
          website: savedCompany.website ?? "",
          teamSize: normalizeCompanySize(savedCompany.company_size) || current.teamSize,
          overview: savedCompany.description ?? "",
          industry:
            (savedCompany as typeof savedCompany & { industry?: string | null }).industry ??
            categoryResponse.data.find((category) => category.id === savedCompany.category_id)?.name ??
            current.industry,
        }));
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your company information.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, user?.role]);

  function updateField<K extends keyof CompanyVerificationInformation>(
    field: K,
    value: CompanyVerificationInformation[K],
  ) {
    setInformation((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const selectedIndustry =
      categoryId === "other"
        ? otherIndustry.trim()
        : categories.find((category) => String(category.id) === categoryId)?.name ??
          information.industry.trim();
    if (categoryId === "other" && !otherIndustry.trim()) {
      setError("Enter your company industry.");
      return;
    }
    if (categoryId && categoryId !== "other") {
      updateField("industry", selectedIndustry);
    }
    const effectiveInformation =
      categoryId === "other"
        ? { ...information, industry: otherIndustry.trim() }
        : { ...information, industry: selectedIndustry };
    if (!isCompanyVerificationInformationComplete(effectiveInformation)) {
      setError(
        "Check the company details and provide an overview of at least 100 non-space characters.",
      );
      return;
    }
    if (
      !categoryId ||
      (!employerCompanySizes.some((size) => size.value === information.teamSize) &&
        information.teamSize !== "500+") ||
      !address.trim() ||
      !information.country ||
      !city.trim() ||
      !contactPhone.trim()
    ) {
      setError("Choose a company category and country, and provide the address, city, and contact phone.");
      return;
    }
    if (!isValidPhoneNumber(contactPhone)) {
      setError("Enter a valid phone number using 7 to 15 digits and standard phone formatting.");
      return;
    }
    if (!token || user?.role !== "employer") {
      setError("Sign in with an employer account to save company information.");
      return;
    }

    setIsSaving(true);
    try {
      const normalizedWebsite =
        information.website.trim() &&
        /^https?:\/\//i.test(information.website.trim())
          ? information.website.trim()
          : `https://${information.website.trim()}`;
      await employerCompanyApi.save(token, {
        name: effectiveInformation.legalName.trim(),
        category_id: categoryId === "other" ? null : Number(categoryId),
        company_size: effectiveInformation.teamSize,
        address: address.trim(),
        country: effectiveInformation.country,
        city: city.trim(),
        industry: selectedIndustry,
        website: normalizedWebsite,
        description: effectiveInformation.overview.trim(),
        contact_name: user.name,
        contact_phone: contactPhone.trim(),
        contact_email: user.email,
      });
      companyVerificationApi.saveCompanyInformation({
        ...effectiveInformation,
        website: normalizedWebsite,
      });
      navigate("/employer/verification", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Company information could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f5f8f8] px-4 py-10 font-sans text-[#263a3c]">
      <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-[#e5eeec] bg-white p-6 shadow-[0_8px_30px_rgba(27,54,52,0.08)] md:p-9">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#078b8d]">
          CareerConnect for employers · Step 2 of 4
        </p>
        <h1 className="mt-3 text-2xl font-bold">Company information</h1>
        <p className="mt-2 text-sm leading-6 text-[#718082]">
          Company profile details are saved to your account. Include your registration number
          in the verification documents.
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {isLoading && (
            <p className="rounded-lg bg-[#f3f8f7] p-3 text-sm text-[#657779]" role="status">
              Loading company information…
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Legal company name
              </span>
              <input
                autoComplete="organization"
                className={inputClassName}
                onChange={(event) => updateField("legalName", event.currentTarget.value)}
                required
                value={information.legalName}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Country *
              </span>
              <select
                autoComplete="country-name"
                className={inputClassName}
                onChange={(event) => {
                  const countryCode = event.currentTarget.value;
                  updateField("country", countryCode);
                  setCity("");
                  setPhilippineCities([]);
                  setCityLoadError(null);
                  setIsLoadingCities(countryCode === "PH");
                }}
                required
                value={information.country}
              >
                <option value="">Select a country</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-xl border border-[#e5eeec] bg-[#f7faf9] px-3 py-2.5">
              <span className="block text-xs font-semibold text-[#526365]">
                Company size selected in Step 1
              </span>
              <span className="mt-1 block text-sm text-[#344749]">
                {companySizeLabel || "Not selected"}
              </span>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Organization type
              </span>
              <select
                className={inputClassName}
                onChange={(event) =>
                  updateField("entityType", event.currentTarget.value as CompanyEntityType)
                }
                value={information.entityType}
              >
                {entityTypes.map((entityType) => (
                  <option key={entityType.value} value={entityType.value}>
                    {entityType.label}
                  </option>
                ))}
              </select>
            </label>
            {categoryId === "other" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                  Other industry (please specify)
                </span>
                <input
                  className={inputClassName}
                  onChange={(event) => {
                    setOtherIndustry(event.currentTarget.value);
                    updateField("industry", event.currentTarget.value);
                  }}
                  placeholder="Enter your industry"
                  required
                  value={otherIndustry}
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Registration number
              </span>
              <input
                className={inputClassName}
                onChange={(event) =>
                  updateField("registrationNumber", event.currentTarget.value)
                }
                required
                value={information.registrationNumber}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Company website
              </span>
              <input
                autoComplete="url"
                className={inputClassName}
                onChange={(event) => updateField("website", event.currentTarget.value)}
                placeholder="https://example.com"
                required
                type="text"
                value={information.website}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Industry
              </span>
              <select
                className={inputClassName}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setCategoryId(value);
                  if (value === "other") {
                    updateField("industry", "");
                  } else {
                    updateField(
                      "industry",
                      event.currentTarget.selectedOptions[0]?.text ?? "",
                    );
                  }
                }}
                required
                value={categoryId}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Street address
              </span>
              <input
                autoComplete="street-address"
                className={inputClassName}
                onChange={(event) => setAddress(event.currentTarget.value)}
                required
                value={address}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                City
              </span>
              {information.country === "PH" ? (
                <>
                  <select
                    autoComplete="address-level2"
                    className={inputClassName}
                    disabled={isLoadingCities || Boolean(cityLoadError)}
                    onChange={(event) => setCity(event.currentTarget.value)}
                    required
                    value={city}
                  >
                    <option value="">
                      {isLoadingCities ? "Loading Philippine cities…" : "Select a city"}
                    </option>
                    {philippineCities.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {cityLoadError && (
                    <span className="mt-1 block text-xs text-[#a2534c]" role="alert">
                      {cityLoadError}
                    </span>
                  )}
                  <span className="mt-1 block text-[10px] text-[#849293]">
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
                  </span>
                </>
              ) : (
                <input
                  autoComplete="address-level2"
                  className={inputClassName}
                  onChange={(event) => setCity(event.currentTarget.value)}
                  required
                  value={city}
                />
              )}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Contact phone
              </span>
              <input
                autoComplete="tel"
                className={inputClassName}
                inputMode="tel"
                maxLength={30}
                onChange={(event) => setContactPhone(sanitizePhoneInput(event.currentTarget.value))}
                pattern="\+?[0-9][0-9\s().-]*[0-9]"
                required
                title="Use 7 to 15 digits, with an optional leading + and spaces, hyphens, or parentheses."
                type="tel"
                value={contactPhone}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Your role
              </span>
              <input
                className={inputClassName}
                onChange={(event) => updateField("userRole", event.currentTarget.value)}
                required
                value={information.userRole}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
              Company overview (at least 100 characters)
            </span>
            <textarea
              className={`${inputClassName} min-h-32 resize-y`}
              minLength={100}
              onChange={(event) => updateField("overview", event.currentTarget.value)}
              required
              value={information.overview}
            />
            <span className="mt-1 block text-xs text-[#718082]">
              {information.overview.trim().length}/100 characters minimum
            </span>
          </label>

          {error && (
            <p className="text-sm text-[#a2534c]" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#edf2f1] pt-5 sm:flex-row sm:items-center">
            <button
              className="rounded-xl bg-[#0d8fa2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b7a89] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || isSaving}
              type="submit"
            >
              {isSaving ? "Saving…" : "Save and continue"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const employerCompanyApi = {
  company(token: string) {
    return apiRequest<{
      company: {
        name: string;
        category_id: number | null;
        company_size: string | null;
        address: string | null;
        country: string | null;
        city: string | null;
        industry: string | null;
        website: string | null;
        description: string | null;
        contact_phone: string | null;
      } | null;
    }>("/employer/company", {}, token);
  },

  categories() {
    return apiRequest<{ data: Array<{ id: number; name: string }> }>("/categories");
  },

  save(
    token: string,
    company: {
      name: string;
      category_id: number | null;
      company_size: string;
      address: string;
      country: string;
      city: string;
      industry: string;
      website: string;
      description: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string;
    },
  ) {
    return apiRequest(
      "/employer/company",
      { method: "PUT", data: company },
      token,
    );
  },
};
