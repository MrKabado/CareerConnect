import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
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

export default function EmployerCompanyInformationPage() {
  const { employer } = useEmployerStatus();
  const { record } = useCompanyVerification();
  const navigate = useNavigate();
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

  function updateField<K extends keyof CompanyVerificationInformation>(
    field: K,
    value: CompanyVerificationInformation[K],
  ) {
    setInformation((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isCompanyVerificationInformationComplete(information)) {
      setError(
        "Check the company details and provide an overview of at least 100 non-space characters.",
      );
      return;
    }

    try {
      companyVerificationApi.saveCompanyInformation(information);
      navigate("/employer/verification", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Company information could not be saved.",
      );
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
          Enter your company&apos;s legal details. This demo saves verification
          progress in this browser; no documents or information are sent to a
          backend.
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
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
              <input
                className={inputClassName}
                onChange={(event) => updateField("industry", event.currentTarget.value)}
                required
                value={information.industry}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#526365]">
                Company size
              </span>
              <input
                className={inputClassName}
                onChange={(event) => updateField("teamSize", event.currentTarget.value)}
                required
                value={information.teamSize}
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
              className="rounded-xl bg-[#0d8fa2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b7a89]"
              type="submit"
            >
              Save and continue
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
