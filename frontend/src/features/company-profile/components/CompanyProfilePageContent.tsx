import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";
import {
  getCompanyProfileSlug,
  getCompanyProfileUrl,
  toEditableCompanyProfile,
  updateCompanyProfile,
  type EditableCompanyProfile,
} from "@/features/companies/companyProfiles";
import { useCompanyProfile } from "@/features/companies/useCompanyProfile";
import CompanyVerificationCard from "@/features/company-verification/components/CompanyVerificationCard";
import { companyVerificationApi } from "@/features/company-verification/api";
import EmployerVerificationDocuments from "@/features/employer-verification/components/EmployerVerificationDocuments";
import { CompanyHiringSetupDetails } from "@/components/common/user/companyProfileComponents";
import CompanyMediaManager from "@/features/company-verification/components/CompanyMediaManager";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";

const inputClassName = "w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15";
const cardEditButtonClass = "text-[10px] font-semibold text-[#087879] underline underline-offset-2";

type AboutProfileDraft = Pick<EditableCompanyProfile, "overview" | "industry" | "location" | "founded">;

function ProfileField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#526365]">{label}</span>
      {multiline ? (
        <textarea
          className={`${inputClassName} min-h-24 resize-y`}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={value}
        />
      ) : (
        <input
          className={inputClassName}
          onChange={(event) => onChange(event.currentTarget.value)}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-semibold text-[#526365]">{label}</legend>
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={`${label}-${index}`}>
          <input
            aria-label={`${label} ${index + 1}`}
            className={inputClassName}
            onChange={(event) => onChange(items.map((current, itemIndex) => itemIndex === index ? event.currentTarget.value : current))}
            value={item}
          />
          <button
            aria-label={`Remove ${label.toLocaleLowerCase()} ${index + 1}`}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#a2534c] hover:bg-[#fff5f4]"
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            type="button"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-xs font-semibold text-[#087879] hover:bg-[#f7fbfa]"
        onClick={() => onChange([...items, ""])}
        type="button"
      >
        Add item
      </button>
    </fieldset>
  );
}

export default function EmployerCompanyProfilePage() {
  const { employer } = useEmployerStatus();
  const companyName = employer?.companyName ?? "Maya Philippines";
  const profileSlug = getCompanyProfileSlug(companyName);
  const profile = useCompanyProfile(companyName);
  const verification = useCompanyVerification();
  const employerLogoUrl = verification.record.media?.logo?.url || profile.logoUrl;
  const [editing, setEditing] = useState(false);
  const [editingHiringSetup, setEditingHiringSetup] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [draft, setDraft] = useState<EditableCompanyProfile>(() => toEditableCompanyProfile(profile));
  const [hiringSetupDraft, setHiringSetupDraft] = useState(() => ({
    title: profile.hiringDefaults?.title ?? "",
    department: profile.hiringDefaults?.department ?? "",
    location: profile.hiringDefaults?.location ?? "",
    workspace: profile.hiringDefaults?.workspace ?? "",
    schoolPartnerships: profile.hiringDefaults?.schoolPartnerships ?? "",
    acceptedCourses: profile.hiringDefaults?.acceptedCourses ?? "",
  }));
  const [contactDraft, setContactDraft] = useState(() => ({
    website: profile.website ?? "",
    hiringEmail: profile.hiringEmail ?? "",
    contactNumber: profile.contactNumber ?? "",
  }));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState<AboutProfileDraft>(() => ({
    overview: profile.overview,
    industry: profile.industry,
    location: profile.location,
    founded: profile.founded ?? "",
  }));
  const [aboutSaveError, setAboutSaveError] = useState<string | null>(null);
  const [editingLifeAt, setEditingLifeAt] = useState(false);
  const [lifeAtDraft, setLifeAtDraft] = useState<EditableCompanyProfile["lifeAt"]>(
    () => profile.lifeAt.map((item) => ({ ...item })),
  );
  const [lifeAtSaveError, setLifeAtSaveError] = useState<string | null>(null);
  const [editingBenefits, setEditingBenefits] = useState(false);
  const [benefitDraft, setBenefitDraft] = useState<string[]>(() => [...(profile.benefits ?? [])]);
  const [benefitSaveError, setBenefitSaveError] = useState<string | null>(null);
  const [editingLocations, setEditingLocations] = useState(false);
  const [locationDraft, setLocationDraft] = useState<EditableCompanyProfile["locations"]>(
    () => (profile.locations ?? []).map((location) => ({ ...location })),
  );
  const [locationSaveError, setLocationSaveError] = useState<string | null>(null);

  function openHiringSetupEditor() {
    setHiringSetupDraft({
      title: profile.hiringDefaults?.title ?? "",
      department: profile.hiringDefaults?.department ?? "",
      location: profile.hiringDefaults?.location ?? "",
      workspace: profile.hiringDefaults?.workspace ?? "",
      schoolPartnerships: profile.hiringDefaults?.schoolPartnerships ?? "",
      acceptedCourses: profile.hiringDefaults?.acceptedCourses ?? "",
    });
    setEditingHiringSetup(true);
  }

  function saveHiringSetupEditor() {
    try {
      updateCompanyProfile(profileSlug, {
        ...toEditableCompanyProfile(profile),
        hiringDefaults: hiringSetupDraft,
      });
      companyVerificationApi.setHiringDefaultsComplete(
        Object.values(hiringSetupDraft).every((value) => value.trim().length > 0),
      );
      setEditingHiringSetup(false);
    } catch (caught) {
      setSaveError(
        caught instanceof Error ? caught.message : "The hiring setup could not be saved.",
      );
    }
  }

  function openContactEditor() {
    setContactDraft({
      website: profile.website ?? "",
      hiringEmail: profile.hiringEmail ?? "",
      contactNumber: profile.contactNumber ?? "",
    });
    setEditingContact(true);
  }

  function saveContactEditor() {
    try {
      updateCompanyProfile(profileSlug, {
        ...toEditableCompanyProfile(profile),
        website: contactDraft.website,
        hiringEmail: contactDraft.hiringEmail,
        contactNumber: contactDraft.contactNumber,
      });
      setEditingContact(false);
    } catch (caught) {
      setSaveError(
        caught instanceof Error ? caught.message : "The company contact could not be saved.",
      );
    }
  }

  function openAboutEditor() {
    setAboutDraft({
      overview: profile.overview,
      industry: profile.industry,
      location: profile.location,
      founded: profile.founded ?? "",
    });
    setAboutSaveError(null);
    setEditingAbout(true);
  }

  function saveAboutEditor() {
    try {
      updateCompanyProfile(profileSlug, {
        ...toEditableCompanyProfile(profile),
        ...aboutDraft,
      });
      setEditingAbout(false);
    } catch (caught) {
      setAboutSaveError(
        caught instanceof Error ? caught.message : "The company overview could not be saved.",
      );
    }
  }

  function openLifeAtEditor() {
    setLifeAtDraft(profile.lifeAt.map((item) => ({ ...item })));
    setLifeAtSaveError(null);
    setEditingLifeAt(true);
  }

  function saveLifeAtEditor() {
    try {
      updateCompanyProfile(profileSlug, {
        ...toEditableCompanyProfile(profile),
        lifeAt: lifeAtDraft,
      });
      setEditingLifeAt(false);
    } catch (caught) {
      setLifeAtSaveError(
        caught instanceof Error ? caught.message : "Company values could not be saved.",
      );
    }
  }

  function openBenefitsEditor() {
    setBenefitDraft([...(profile.benefits ?? [])]);
    setBenefitSaveError(null);
    setEditingBenefits(true);
  }

  function saveBenefitsEditor() {
    try {
      updateCompanyProfile(profileSlug, {
        ...toEditableCompanyProfile(profile),
        benefits: benefitDraft.filter((benefit) => benefit.trim().length > 0),
      });
      setEditingBenefits(false);
    } catch (caught) {
      setBenefitSaveError(
        caught instanceof Error ? caught.message : "Benefits could not be saved.",
      );
    }
  }

  function openLocationsEditor() {
    setLocationDraft((profile.locations ?? []).map((location) => ({ ...location })));
    setLocationSaveError(null);
    setEditingLocations(true);
  }

  function saveLocationsEditor() {
    try {
      updateCompanyProfile(profileSlug, {
        ...toEditableCompanyProfile(profile),
        locations: locationDraft.filter((location) => location.city.trim().length > 0),
      });
      setEditingLocations(false);
    } catch (caught) {
      setLocationSaveError(
        caught instanceof Error ? caught.message : "Hiring locations could not be saved.",
      );
    }
  }

  function updateDraft<Key extends keyof EditableCompanyProfile>(
    key: Key,
    value: EditableCompanyProfile[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      updateCompanyProfile(profileSlug, draft);
      if (draft.logoUrl.trim() !== profile.logoUrl?.trim()) {
        const media = companyVerificationApi.getSnapshot().record.media ?? {
          logo: null,
          banner: null,
          gallery: [],
          videoUrl: "",
          coverImageId: null,
        };
        companyVerificationApi.setCompanyMedia({
          ...media,
          logo: draft.logoUrl.trim()
            ? {
                id: media.logo?.id ?? `company-logo-${Date.now()}`,
                url: draft.logoUrl.trim(),
                altText: `${draft.name} logo`,
              }
            : null,
        });
      }
      companyVerificationApi.setHiringDefaultsComplete(
        Object.values(draft.hiringDefaults).every((value) => value.trim().length > 0),
      );
      setEditing(false);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "The company profile could not be saved.");
    }
  }

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:py-5">
            <div className="relative isolate mb-5 flex flex-col gap-3 py-5 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-[#deeeeb] before:bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[9px] font-semibold text-[#188783]">
                  {profile.name}
                </p>
                <h1 className="mt-2 text-[25px] leading-tight font-bold tracking-[-0.8px] text-[#263638] max-[600px]:text-[22px]">
                  Company Profile
                </h1>
                <p className="mt-1 text-[11px] text-[#849293]">
                  Manage how {profile.name} appears to job and OJT applicants.
                </p>
              </div>

              <Link
                to={getCompanyProfileUrl(profile.name)}
                className="inline-flex items-center justify-center rounded-xl border border-[#dfe8e7] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d3133] shadow-sm transition hover:border-[#d1e6e4]"
              >
                <svg className="mr-2" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 3.5v12M3.5 10h13" />
                </svg>
                Preview public profile
              </Link>
            </div>

            <section className="rounded-[18px] border border-[#dfeae8] bg-white p-4 shadow-[0_10px_20px_rgba(27,54,52,0.03)] md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-[72px] w-[72px] place-items-center rounded-[18px] bg-[#0d8fa2] text-[28px] font-bold text-white shadow-[0_10px_20px_rgba(12,143,162,0.22)]">
                    {employerLogoUrl ? (
                      <img alt={`${profile.name} logo`} className="size-full rounded-[18px] object-cover" src={employerLogoUrl} />
                    ) : profile.initials}
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {profile.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#def4ee] px-2 py-1 text-[9px] font-semibold text-[#228578]">
                          <span aria-hidden="true">✓</span> Verified employer
                        </span>
                      )}
                      {profile.recommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1d9] px-2 py-1 text-[9px] font-semibold text-[#a2782d]">
                          Top recommended
                        </span>
                      )}
                    </div>

                    <h2 className="text-[28px] font-bold tracking-[-0.06em] text-[#1d3034]">
                      {profile.name}
                    </h2>
                    <p className="mt-1 text-[11px] text-[#5a6e70]">
                      {profile.tagline || `${profile.industry} · ${profile.location}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-[15px] border border-[#e2eeeb] bg-[#f6fbfa] px-4 py-3 text-center">
                    <div className="text-[17px] font-bold text-[#1d3133]">{profile.teamSize}</div>
                    <div className="mt-1 text-[9px] text-[#7d8b8d]">Employees</div>
                  </div>
                  <div className="rounded-[15px] border border-[#e2eeeb] bg-[#f6fbfa] px-4 py-3 text-center">
                    <div className="text-[17px] font-bold text-[#1d3133]">{profile.rating}</div>
                    <div className="mt-1 text-[9px] text-[#7d8b8d]">Employer rating</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
              <div className="space-y-5">
                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveAboutEditor();
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                          About {profile.name}
                        </h2>
                        <p className="mt-1 text-[11px] text-[#6a7d7d]">
                          Company overview and hiring snapshot
                        </p>
                      </div>
                      {!editingAbout ? (
                        <button
                          type="button"
                          className={cardEditButtonClass}
                          onClick={openAboutEditor}
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>

                    {editingAbout ? (
                      <>
                        <label className="block text-[10px] font-semibold text-[#526365]">
                          Company overview
                          <textarea
                            autoFocus
                            className="mt-2 min-h-28 w-full resize-y rounded-[10px] border border-[#dfe9e7] bg-[#f7fbfa] p-3 text-[12px] leading-6 font-normal text-[#4d5f61] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                            onChange={(event) => setAboutDraft((current) => ({ ...current, overview: event.currentTarget.value }))}
                            value={aboutDraft.overview}
                          />
                        </label>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {([
                            ["industry", "Industry"],
                            ["location", "HQ"],
                            ["founded", "Founded"],
                          ] as const).map(([field, label]) => (
                            <label className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3" key={field}>
                              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                                {label}
                              </span>
                              <input
                                className="mt-2 w-full rounded-md border border-[#dfe9e7] bg-white px-2 py-1.5 text-[13px] font-semibold text-[#1d3133] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                                onChange={(event) => setAboutDraft((current) => ({ ...current, [field]: event.currentTarget.value }))}
                                value={aboutDraft[field]}
                              />
                            </label>
                          ))}
                        </div>

                        {aboutSaveError ? (
                          <p className="mt-3 text-[10px] text-[#a2534c]" role="alert">
                            {aboutSaveError}
                          </p>
                        ) : null}
                        <div className="mt-4 flex justify-end gap-2 border-t border-[#edf1f0] pt-3">
                          <button
                            className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-[10px] font-semibold text-[#526365] hover:bg-white"
                            onClick={() => {
                              setEditingAbout(false);
                              setAboutSaveError(null);
                            }}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="rounded-lg bg-[#0d8fa2] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#0b7a89]"
                            type="submit"
                          >
                            Save changes
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[12px] leading-6 text-[#4d5f61]">
                          {profile.overview}
                        </p>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                              Industry
                            </div>
                            <div className="mt-2 text-[13px] font-semibold text-[#1d3133]">{profile.industry}</div>
                          </div>
                          <div className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                              HQ
                            </div>
                            <div className="mt-2 text-[13px] font-semibold text-[#1d3133]">{profile.location}</div>
                          </div>
                          <div className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                              Founded
                            </div>
                            <div className="mt-2 text-[13px] font-semibold text-[#1d3133]">{profile.founded || "Not provided"}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </form>
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        Life at {profile.name}
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        The values that guide how we work every day
                      </p>
                    </div>
                    {!editingLifeAt ? (
                      <button
                        className={cardEditButtonClass}
                        onClick={openLifeAtEditor}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {editingLifeAt ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        {lifeAtDraft.map((item, index) => (
                          <article className="rounded-[16px] border border-[#e5eeec] bg-[#f2f8f7] p-4" key={`life-value-${index}`}>
                            <label className="mt-3 block text-[9px] font-semibold text-[#526365]">
                              Value title
                              <input
                                className="mt-1 w-full rounded-md border border-[#dfe9e7] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#1d3034] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                                onChange={(event) => setLifeAtDraft((current) => current.map((value, valueIndex) => valueIndex === index ? { ...value, title: event.currentTarget.value } : value))}
                                value={item.title}
                              />
                            </label>
                            <label className="mt-2 block text-[9px] font-semibold text-[#526365]">
                              Description
                              <textarea
                                className="mt-1 min-h-16 w-full resize-y rounded-md border border-[#dfe9e7] bg-white px-2 py-1.5 text-[10px] leading-4 font-normal text-[#566d6f] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                                onChange={(event) => setLifeAtDraft((current) => current.map((value, valueIndex) => valueIndex === index ? { ...value, description: event.currentTarget.value } : value))}
                                value={item.description}
                              />
                            </label>
                            <label className="mt-2 block text-[9px] font-semibold text-[#526365]">
                              Value style
                              <select
                                className="mt-1 w-full rounded-md border border-[#dfe9e7] bg-white px-2 py-1.5 text-[10px] font-normal text-[#566d6f] outline-none focus:border-[#078b8d]"
                                onChange={(event) => setLifeAtDraft((current) => current.map((value, valueIndex) => valueIndex === index ? { ...value, icon: event.currentTarget.value as typeof value.icon } : value))}
                                value={item.icon}
                              >
                                <option value="impact">Impact</option>
                                <option value="learn">Learning</option>
                                <option value="belong">Belonging</option>
                              </select>
                            </label>
                            <button
                              className="mt-3 text-[9px] font-semibold text-[#a2534c] underline underline-offset-2"
                              onClick={() => setLifeAtDraft((current) => current.filter((_, valueIndex) => valueIndex !== index))}
                              type="button"
                            >
                              Remove value
                            </button>
                          </article>
                        ))}
                      </div>
                      <button
                        className="mt-3 rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-[10px] font-semibold text-[#087879] hover:bg-[#f7fbfa]"
                        onClick={() => setLifeAtDraft((current) => [...current, { icon: "impact", title: "", description: "" }])}
                        type="button"
                      >
                        Add company value
                      </button>
                      {lifeAtSaveError ? <p className="mt-2 text-[10px] text-[#a2534c]" role="alert">{lifeAtSaveError}</p> : null}
                      <div className="mt-4 flex justify-end gap-2 border-t border-[#edf1f0] pt-3">
                        <button
                          className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-[10px] font-semibold text-[#526365] hover:bg-white"
                          onClick={() => {
                            setEditingLifeAt(false);
                            setLifeAtSaveError(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-lg bg-[#0d8fa2] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#0b7a89]"
                          onClick={saveLifeAtEditor}
                          type="button"
                        >
                          Save changes
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {profile.lifeAt.map((item) => (
                        <article key={item.title} className="rounded-[16px] bg-[#f2f8f7] p-4">
                          <h3 className="text-[13px] font-bold text-[#1d3034]">{item.title}</h3>
                          <p className="mt-2 text-[11px] leading-5 text-[#566d6f]">{item.description}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        Benefits and workplace
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        What candidates can expect when they join {profile.name}
                      </p>
                    </div>
                    {!editingBenefits ? (
                      <button
                        className={cardEditButtonClass}
                        onClick={openBenefitsEditor}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {editingBenefits ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {benefitDraft.map((benefit, index) => (
                          <label
                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#dfeae8] bg-[#f8fbfa] px-2.5 py-1.5 text-[10px] text-[#53697a]"
                            key={`benefit-${index}`}
                          >
                            <span className="sr-only">Benefit {index + 1}</span>
                            <input
                              className="min-w-0 bg-transparent outline-none placeholder:text-[#94a1a1] focus-visible:ring-1 focus-visible:ring-[#078b8d]"
                              onChange={(event) => setBenefitDraft((current) => current.map((value, valueIndex) => valueIndex === index ? event.currentTarget.value : value))}
                              placeholder="Enter a benefit"
                              value={benefit}
                            />
                            <button
                              aria-label={`Remove benefit ${index + 1}`}
                              className="shrink-0 px-1 font-semibold text-[#a2534c]"
                              onClick={() => setBenefitDraft((current) => current.filter((_, valueIndex) => valueIndex !== index))}
                              type="button"
                            >
                              Remove
                            </button>
                          </label>
                        ))}
                      </div>
                      <button
                        className="mt-3 rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-[10px] font-semibold text-[#087879] hover:bg-[#f7fbfa]"
                        onClick={() => setBenefitDraft((current) => [...current, ""])}
                        type="button"
                      >
                        Add benefit
                      </button>
                      {benefitSaveError ? <p className="mt-2 text-[10px] text-[#a2534c]" role="alert">{benefitSaveError}</p> : null}
                      <div className="mt-4 flex justify-end gap-2 border-t border-[#edf1f0] pt-3">
                        <button
                          className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-[10px] font-semibold text-[#526365] hover:bg-white"
                          onClick={() => {
                            setEditingBenefits(false);
                            setBenefitSaveError(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-lg bg-[#0d8fa2] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#0b7a89]"
                          onClick={saveBenefitsEditor}
                          type="button"
                        >
                          Save changes
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.benefits?.map((benefit) => (
                        <span
                          key={benefit}
                          className="rounded-full border border-[#dfeae8] bg-[#f8fbfa] px-2.5 py-1.5 text-[10px] font-medium text-[#53697a]"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        Hiring locations
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        {profile.name} teams currently hiring across the country
                      </p>
                    </div>
                    {!editingLocations ? (
                      <button
                        className={cardEditButtonClass}
                        onClick={openLocationsEditor}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {editingLocations ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        {locationDraft.map((location, index) => (
                          <article className="rounded-[16px] border border-[#e7efee] bg-[#f7fbfa] p-4" key={`location-${index}`}>
                            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#def4ee] text-[#0d8fa2]">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 21s6-5.69 6-11a6 6 0 1 0-12 0c0 5.31 6 11 6 11Z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                            </div>
                            <label className="mt-3 block text-[9px] font-semibold text-[#526365]">
                              City or location
                              <input
                                className="mt-1 w-full rounded-md border border-[#dfe9e7] bg-white px-2 py-1.5 text-center text-[11px] font-semibold text-[#1d3034] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                                onChange={(event) => setLocationDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, city: event.currentTarget.value } : item))}
                                value={location.city}
                              />
                            </label>
                            <label className="mt-2 block text-[9px] font-semibold text-[#526365]">
                              Location label
                              <input
                                className="mt-1 w-full rounded-md border border-[#dfe9e7] bg-white px-2 py-1.5 text-center text-[10px] text-[#677d7d] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                                onChange={(event) => setLocationDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.currentTarget.value } : item))}
                                value={location.label}
                              />
                            </label>
                            <button
                              className="mt-3 w-full text-[9px] font-semibold text-[#a2534c] underline underline-offset-2"
                              onClick={() => setLocationDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                              type="button"
                            >
                              Remove location
                            </button>
                          </article>
                        ))}
                      </div>
                      <button
                        className="mt-3 rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-[10px] font-semibold text-[#087879] hover:bg-[#f7fbfa]"
                        onClick={() => setLocationDraft((current) => [...current, { city: "", label: "" }])}
                        type="button"
                      >
                        Add hiring location
                      </button>
                      {locationSaveError ? <p className="mt-2 text-[10px] text-[#a2534c]" role="alert">{locationSaveError}</p> : null}
                      <div className="mt-4 flex justify-end gap-2 border-t border-[#edf1f0] pt-3">
                        <button
                          className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-[10px] font-semibold text-[#526365] hover:bg-white"
                          onClick={() => {
                            setEditingLocations(false);
                            setLocationSaveError(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-lg bg-[#0d8fa2] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#0b7a89]"
                          onClick={saveLocationsEditor}
                          type="button"
                        >
                          Save changes
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {profile.locations?.map((location) => (
                        <div key={location.city} className="rounded-[16px] border border-[#e7efee] bg-[#f7fbfa] p-4 text-center">
                          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#def4ee] text-[#0d8fa2]">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 21s6-5.69 6-11a6 6 0 1 0-12 0c0 5.31 6 11 6 11Z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                          </div>
                          <h3 className="mt-3 text-[13px] font-bold text-[#1d3034]">{location.city}</h3>
                          <p className="mt-1 text-[10px] text-[#677d7d]">{location.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <CompanyMediaManager />
              </div>

              <aside className="space-y-5">
                <CompanyVerificationCard />
                <CompanyHiringSetupDetails
                  draft={hiringSetupDraft}
                  editing={editingHiringSetup}
                  onChange={(field, value) => setHiringSetupDraft((current) => ({ ...current, [field]: value }))}
                  onCancel={() => setEditingHiringSetup(false)}
                  onEdit={openHiringSetupEditor}
                  onSave={saveHiringSetupEditor}
                  profile={profile}
                />

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[14px] font-bold text-[#1d3034]">Company contact</h2>
                    {!editingContact ? (
                      <button
                        className={cardEditButtonClass}
                        onClick={openContactEditor}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {editingContact ? (
                    <div className="mt-4 space-y-3 text-[9px] text-[#829091]">
                      <label className="flex items-start justify-between gap-3">
                        <span className="shrink-0 pt-2.5">Website</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => setContactDraft((current) => ({ ...current, website: event.currentTarget.value }))}
                          value={contactDraft.website}
                        />
                      </label>
                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2">
                        <span className="shrink-0 pt-2.5">Hiring email</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => setContactDraft((current) => ({ ...current, hiringEmail: event.currentTarget.value }))}
                          value={contactDraft.hiringEmail}
                        />
                      </label>
                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2">
                        <span className="shrink-0 pt-2.5">Contact</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => setContactDraft((current) => ({ ...current, contactNumber: event.currentTarget.value }))}
                          value={contactDraft.contactNumber}
                        />
                      </label>

                      <div className="mt-3 flex justify-end gap-2 border-t border-[#edf1f1] pt-3">
                        <button
                          className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[10px] font-semibold text-[#526365] hover:bg-white"
                          onClick={() => setEditingContact(false)}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-xl bg-[#0d8fa2] px-4 py-2 text-[10px] font-semibold text-white hover:bg-[#0b7a89]"
                          onClick={saveContactEditor}
                          type="button"
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <dl className="mt-4 space-y-3 text-[11px] text-[#5a6970]">
                      <div className="flex items-center justify-between gap-3">
                        <dt>Website</dt>
                        <dd className="font-medium text-[#1d3133]">{profile.website || "Not provided"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Hiring email</dt>
                        <dd className="font-medium text-[#1d3133]">{profile.hiringEmail || "Not provided"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Contact</dt>
                        <dd className="font-medium text-[#1d3133]">{profile.contactNumber || "Not provided"}</dd>
                      </div>
                    </dl>
                  )}
                </div>
                <EmployerVerificationDocuments />
              </aside>
            </section>
      </main>
      {editing && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#162b2b]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(false);
          }}
        >
          <section
            aria-labelledby="edit-company-profile-title"
            aria-modal="true"
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            role="dialog"
          >
            <header className="border-b border-[#edf1f1] px-6 py-5">
              <h2 className="text-lg font-bold text-[#263a3c]" id="edit-company-profile-title">
                Edit public profile
              </h2>
              <p className="mt-1 text-sm text-[#687b7e]">
                Update all public company details. Your changes appear on the applicant-facing profile after saving.
              </p>
            </header>
            <form className="min-h-0 flex-1 overflow-y-auto p-6" onSubmit={handleSave}>
              <div className="space-y-7">
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-[#263a3c]">Company identity</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField label="Company name" value={draft.name} onChange={(value) => updateDraft("name", value)} />
                    <ProfileField label="Logo initials" value={draft.initials} onChange={(value) => updateDraft("initials", value.slice(0, 3))} />
                    <ProfileField label="Logo image URL" value={draft.logoUrl} onChange={(value) => updateDraft("logoUrl", value)} />
                    <ProfileField label="Tagline" value={draft.tagline} onChange={(value) => updateDraft("tagline", value)} />
                    <ProfileField label="Industry" value={draft.industry} onChange={(value) => updateDraft("industry", value)} />
                    <ProfileField label="Headquarters" value={draft.location} onChange={(value) => updateDraft("location", value)} />
                    <ProfileField label="Company size" value={draft.teamSize} onChange={(value) => updateDraft("teamSize", value)} />
                    <ProfileField label="Founded" value={draft.founded} onChange={(value) => updateDraft("founded", value)} />
                  </div>
                  <p className="text-xs text-[#829092]">Verified status and employer rating are maintained by CareerConnect.</p>
                </section>

                <section className="space-y-4 border-t border-[#edf1f1] pt-6">
                  <h3 className="text-sm font-bold text-[#263a3c]">About the company</h3>
                  <ProfileField label="Company overview" value={draft.overview} onChange={(value) => updateDraft("overview", value)} multiline />
                  <ProfileField label="Culture summary" value={draft.cultureSummary} onChange={(value) => updateDraft("cultureSummary", value)} multiline />
                  <StringListEditor label="Why applicants should consider your company" items={draft.highlights} onChange={(items) => updateDraft("highlights", items)} />
                </section>

                <section className="space-y-4 border-t border-[#edf1f1] pt-6">
                  <h3 className="text-sm font-bold text-[#263a3c]">Life at the company</h3>
                  {draft.lifeAt.map((item, index) => (
                    <div className="grid gap-3 rounded-xl border border-[#e5eeec] p-4 sm:grid-cols-2" key={`life-${index}`}>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-[#526365]">Icon style</span>
                        <select
                          className={inputClassName}
                          onChange={(event) => updateDraft("lifeAt", draft.lifeAt.map((current, itemIndex) => itemIndex === index ? { ...current, icon: event.currentTarget.value as typeof current.icon } : current))}
                          value={item.icon}
                        >
                          <option value="impact">Impact</option>
                          <option value="learn">Learning</option>
                          <option value="belong">Belonging</option>
                        </select>
                      </label>
                      <ProfileField label="Title" value={item.title} onChange={(value) => updateDraft("lifeAt", draft.lifeAt.map((current, itemIndex) => itemIndex === index ? { ...current, title: value } : current))} />
                      <div className="sm:col-span-2">
                        <ProfileField label="Description" value={item.description} onChange={(value) => updateDraft("lifeAt", draft.lifeAt.map((current, itemIndex) => itemIndex === index ? { ...current, description: value } : current))} multiline />
                      </div>
                      <button className="justify-self-start text-xs font-semibold text-[#a2534c]" onClick={() => updateDraft("lifeAt", draft.lifeAt.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove value</button>
                    </div>
                  ))}
                  <button className="rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-xs font-semibold text-[#087879]" onClick={() => updateDraft("lifeAt", [...draft.lifeAt, { icon: "impact", title: "", description: "" }])} type="button">Add company value</button>
                </section>

                <section className="space-y-4 border-t border-[#edf1f1] pt-6">
                  <h3 className="text-sm font-bold text-[#263a3c]">Benefits and hiring locations</h3>
                  <StringListEditor label="Benefits" items={draft.benefits} onChange={(items) => updateDraft("benefits", items)} />
                  {draft.locations.map((location, index) => (
                    <div className="grid gap-3 rounded-xl border border-[#e5eeec] p-4 sm:grid-cols-2" key={`location-${index}`}>
                      <ProfileField label="City or location" value={location.city} onChange={(value) => updateDraft("locations", draft.locations.map((current, itemIndex) => itemIndex === index ? { ...current, city: value } : current))} />
                      <ProfileField label="Location label" value={location.label} onChange={(value) => updateDraft("locations", draft.locations.map((current, itemIndex) => itemIndex === index ? { ...current, label: value } : current))} />
                      <button className="justify-self-start text-xs font-semibold text-[#a2534c] sm:col-span-2" onClick={() => updateDraft("locations", draft.locations.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove location</button>
                    </div>
                  ))}
                  <button className="rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-xs font-semibold text-[#087879]" onClick={() => updateDraft("locations", [...draft.locations, { city: "", label: "" }])} type="button">Add hiring location</button>
                </section>

                <section className="space-y-4 border-t border-[#edf1f1] pt-6">
                  <h3 className="text-sm font-bold text-[#263a3c]">Hiring setup defaults</h3>
                  <div className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]">
                    <div className="space-y-3 text-[9px]">
                      <label className="flex items-start justify-between gap-3 pb-2 text-[#829091]">
                        <span className="shrink-0 pt-2.5">Default role</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => updateDraft("hiringDefaults", { ...draft.hiringDefaults, title: event.currentTarget.value })}
                          value={draft.hiringDefaults.title}
                        />
                      </label>

                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2 text-[#829091]">
                        <span className="shrink-0 pt-2.5">Department</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => updateDraft("hiringDefaults", { ...draft.hiringDefaults, department: event.currentTarget.value })}
                          value={draft.hiringDefaults.department}
                        />
                      </label>

                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2 text-[#829091]">
                        <span className="shrink-0 pt-2.5">Location</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => updateDraft("hiringDefaults", { ...draft.hiringDefaults, location: event.currentTarget.value })}
                          value={draft.hiringDefaults.location}
                        />
                      </label>

                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2 text-[#829091]">
                        <span className="shrink-0 pt-2.5">Work setup</span>
                        <select
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => updateDraft("hiringDefaults", { ...draft.hiringDefaults, workspace: event.currentTarget.value })}
                          value={draft.hiringDefaults.workspace}
                        >
                          <option value="Hybrid">Hybrid</option>
                          <option value="Remote">Remote</option>
                          <option value="On-site">On-site</option>
                        </select>
                      </label>

                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2 text-[#829091]">
                        <span className="shrink-0 pt-2.5">School partnerships</span>
                        <textarea
                          className="min-h-[48px] w-full max-w-[62%] resize-y rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => updateDraft("hiringDefaults", { ...draft.hiringDefaults, schoolPartnerships: event.currentTarget.value })}
                          value={draft.hiringDefaults.schoolPartnerships}
                        />
                      </label>

                      <label className="flex items-start justify-between gap-3 border-t border-[#edf1f1] pt-2 text-[#829091]">
                        <span className="shrink-0 pt-2.5">Accepted courses</span>
                        <input
                          className="w-full max-w-[62%] rounded-[8px] border border-[#dfeae8] bg-[#f8fbfa] px-3 py-2 text-right text-[10px] font-medium text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
                          onChange={(event) => updateDraft("hiringDefaults", { ...draft.hiringDefaults, acceptedCourses: event.currentTarget.value })}
                          value={draft.hiringDefaults.acceptedCourses}
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 border-t border-[#edf1f1] pt-6">
                  <h3 className="text-sm font-bold text-[#263a3c]">Open roles</h3>
                  {draft.openRoles.map((role, index) => (
                    <div className="grid gap-3 rounded-xl border border-[#e5eeec] p-4 sm:grid-cols-2" key={role.id}>
                      {([
                        ["title", "Role title"],
                        ["category", "Category"],
                        ["location", "Role location"],
                        ["type", "Role type"],
                        ["arrangement", "Work arrangement"],
                        ["salary", "Salary or compensation"],
                      ] as const).map(([field, label]) => (
                        <ProfileField key={field} label={label} value={role[field]} onChange={(value) => updateDraft("openRoles", draft.openRoles.map((current, itemIndex) => itemIndex === index ? { ...current, [field]: value } : current))} />
                      ))}
                      <div className="sm:col-span-2">
                        <ProfileField label="Description" value={role.description} onChange={(value) => updateDraft("openRoles", draft.openRoles.map((current, itemIndex) => itemIndex === index ? { ...current, description: value } : current))} multiline />
                      </div>
                      <ProfileField label="Skills (comma separated)" value={role.skills.join(", ")} onChange={(value) => updateDraft("openRoles", draft.openRoles.map((current, itemIndex) => itemIndex === index ? { ...current, skills: value.split(",").map((skill) => skill.trim()).filter(Boolean) } : current))} />
                      <button className="self-end justify-self-start text-xs font-semibold text-[#a2534c]" onClick={() => updateDraft("openRoles", draft.openRoles.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove role</button>
                    </div>
                  ))}
                  <button className="rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-xs font-semibold text-[#087879]" onClick={() => updateDraft("openRoles", [...draft.openRoles, { id: `role-${Date.now()}`, title: "", category: "", location: draft.location, type: "Job", arrangement: "", salary: "", description: "", skills: [] }])} type="button">Add open role</button>
                </section>

                <section className="space-y-4 border-t border-[#edf1f1] pt-6">
                  <h3 className="text-sm font-bold text-[#263a3c]">Application process and contact</h3>
                  <StringListEditor label="Application steps" items={draft.applicationProcess} onChange={(items) => updateDraft("applicationProcess", items)} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField label="Website" value={draft.website} onChange={(value) => updateDraft("website", value)} />
                    <ProfileField label="Hiring email" value={draft.hiringEmail} onChange={(value) => updateDraft("hiringEmail", value)} type="email" />
                    <ProfileField label="Contact number" value={draft.contactNumber} onChange={(value) => updateDraft("contactNumber", value)} />
                  </div>
                </section>
              </div>
              {saveError && <p className="text-sm text-[#a2534c]" role="alert">{saveError}</p>}
              <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-[#edf1f1] bg-white pt-4">
                <button
                  className="rounded-xl border border-[#dfe8e7] px-4 py-2.5 text-sm font-semibold text-[#526365] hover:bg-[#f7fbfa]"
                  onClick={() => setEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-[#0d8fa2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b7a89]"
                  type="submit"
                >
                  Save profile
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </EmployerWorkspaceLayout>
  );
}
