import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import { useAuth } from "@/features/auth/useAuth";
import { apiRequest } from "@/lib/axios";
import {
  companyVerificationApi,
  isCompanyVerificationInformationComplete,
} from "@/features/company-verification/api";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";
import type {
  CompanyEntityType,
  CompanyVerificationInformation,
} from "@/features/company-verification/types";

const entityTypes: Array<{ value: CompanyEntityType; label: string }> = [
  { value: "sole_proprietor", label: "Sole proprietor" },
  { value: "company", label: "Company" },
  { value: "agency_recruiter", label: "Agency or recruiter" },
  { value: "public_or_nonprofit", label: "Public or nonprofit organization" },
];

const inputClassName =
  "w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15";
const companySizes = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

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
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [information, setInformation] = useState<CompanyVerificationInformation>(
    () => ({
      legalName: record.companyInformation?.legalName ?? employer?.companyName ?? "",
      country: record.companyInformation?.country ?? "",
      entityType: record.companyInformation?.entityType ?? "company",
      registrationNumber: record.companyInformation?.registrationNumber ?? "",
      website: record.companyInformation?.website ?? employer?.website ?? "",
      industry: record.companyInformation?.industry ?? employer?.industry ?? "",
      teamSize: record.companyInformation?.teamSize ?? employer?.companySize ?? "",
      userRole: record.companyInformation?.userRole ?? employer?.companyRole ?? "",
      overview: record.companyInformation?.overview ?? "",
    }),
  );
  const [error, setError] = useState<string | null>(null);

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
        setAddress(savedCompany.address ?? "");
        setCity(savedCompany.city ?? "");
        setContactPhone(savedCompany.contact_phone ?? "");
        setInformation((current) => ({
          ...current,
          legalName: savedCompany.name,
          website: savedCompany.website ?? "",
          teamSize: savedCompany.company_size ?? "",
          overview: savedCompany.description ?? "",
          industry:
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
    if (!isCompanyVerificationInformationComplete(information)) {
      setError(
        "Check the company details and provide an overview of at least 100 non-space characters.",
      );
      return;
    }
    if (
      !categoryId ||
      !companySizes.some((size) => size === information.teamSize) ||
      !address.trim() ||
      !city.trim() ||
      !contactPhone.trim()
    ) {
      setError("Choose a company category and size, and provide the address, city, and contact phone.");
      return;
    }
    if (!token || user?.role !== "employer") {
      setError("Sign in with an employer account to save company information.");
      return;
    }

    setIsSaving(true);
    try {
      await employerCompanyApi.save(token, {
        name: information.legalName.trim(),
        category_id: Number(categoryId),
        company_size: information.teamSize,
        address: address.trim(),
        city: city.trim(),
        website: information.website.trim(),
        description: information.overview.trim(),
        contact_name: user.name,
        contact_phone: contactPhone.trim(),
        contact_email: user.email,
      });
      companyVerificationApi.saveCompanyInformation(information);
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
          in the verification documents; country and organization type are temporary form details.
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
                Country
              </span>
              <input
                autoComplete="country-name"
                className={inputClassName}
                onChange={(event) => updateField("country", event.currentTarget.value)}
                required
                value={information.country}
              />
            </label>
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
                type="url"
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
                  updateField("industry", event.currentTarget.selectedOptions[0]?.text ?? "");
                  setCategoryId(event.currentTarget.value);
                }}
                required
                value={categoryId}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Company size
              </span>
              <select
                className={inputClassName}
                onChange={(event) => updateField("teamSize", event.currentTarget.value)}
                required
                value={information.teamSize}
              >
                <option value="">Select company size</option>
                {companySizes.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
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
              <input
                autoComplete="address-level2"
                className={inputClassName}
                onChange={(event) => setCity(event.currentTarget.value)}
                required
                value={city}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Contact phone
              </span>
              <input
                autoComplete="tel"
                className={inputClassName}
                onChange={(event) => setContactPhone(event.currentTarget.value)}
                required
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
        city: string | null;
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
      category_id: number;
      company_size: string;
      address: string;
      city: string;
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
