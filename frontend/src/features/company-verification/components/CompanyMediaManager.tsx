import { useEffect, useState, type FormEvent } from "react";
import { companyVerificationApi } from "@/features/company-verification/api";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";
import { useAuth } from "@/features/auth/useAuth";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";
import type {
  CompanyMediaAsset,
  CompanyMediaCollection,
} from "@/features/company-profile/types";

const emptyMedia: CompanyMediaCollection = {
  logo: null,
  banner: null,
  gallery: [],
  videoUrl: "",
  coverImageId: null,
};

function makeAsset(): CompanyMediaAsset {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `company-media-${Date.now()}`,
    url: "",
    altText: "",
  };
}

function isImageUrl(value: string): boolean {
  if (value.startsWith("data:image/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function CompanyMediaManager() {
  const { user, token } = useAuth();
  const verification = useCompanyVerification();
  const savedMedia = verification.record.media ?? emptyMedia;
  const [draft, setDraft] = useState<CompanyMediaCollection>(savedMedia);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(savedMedia.logo?.url ?? null);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "employer") return;
    let active = true;
    employerVerificationFilesApi
      .company(token)
      .then(({ company }) => {
        if (!active) return;
        const backendLogoUrl = company?.logo_url ?? null;
        setLogoUrl(backendLogoUrl);
        if ((savedMedia.logo?.url ?? null) !== backendLogoUrl) {
          try {
            companyVerificationApi.setCompanyMedia({
              ...savedMedia,
              logo: backendLogoUrl
                ? { id: "server-company-logo", url: backendLogoUrl, altText: "Company logo" }
                : null,
            });
          } catch {
            setError("Logo loaded, but the local profile preview could not be refreshed.");
          }
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load the company logo.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [savedMedia, token, user?.role]);

  const resetDraft = () => {
    setDraft(savedMedia);
    setError(null);
  };

  function updatePhoto(id: string, field: "url" | "altText", value: string) {
    setDraft((current) => ({
      ...current,
      gallery: current.gallery.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              [field]: value,
            }
          : photo,
      ),
    }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const assets = draft.gallery;
    if (assets.some((asset) => !isImageUrl(asset.url.trim()) || !asset.altText.trim())) {
      setError("Add a valid image URL and descriptive alt text for each demo photo.");
      return;
    }

    try {
      companyVerificationApi.setCompanyMedia({
        ...draft,
        logo: logoUrl
          ? {
              id: draft.logo?.id ?? "server-company-logo",
              url: logoUrl,
              altText: draft.logo?.altText || "Company logo",
            }
          : null,
      });
      setError(null);
      setIsEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save company media.",
      );
    }
  }

  async function handleLogoUpload(file?: File) {
    if (!file) return;
    if (!token || user?.role !== "employer") {
      setError("Sign in with an employer account before uploading a company logo.");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !/\.(jpe?g|png|webp)$/i.test(file.name)
    ) {
      setError("Choose a JPG, PNG, or WebP logo.");
      return;
    }
    if (file.size === 0 || file.size > 2 * 1024 * 1024) {
      setError("The company logo must be larger than 0 bytes and no more than 2 MB.");
      return;
    }

    setError(null);
    setLogoUploadProgress(0);
    try {
      const uploadedUrl = await employerVerificationFilesApi.uploadLogo(
        token,
        file,
        setLogoUploadProgress,
      );
      setLogoUrl(uploadedUrl);
      setDraft((current) => ({
        ...current,
        logo: {
          id: current.logo?.id ?? "server-company-logo",
          url: uploadedUrl,
          altText: "Company logo",
        },
      }));
      try {
        companyVerificationApi.setCompanyMedia({
          ...savedMedia,
          logo: {
            id: "server-company-logo",
            url: uploadedUrl,
            altText: "Company logo",
          },
        });
      } catch {
        setError("Logo uploaded, but the local profile preview could not be refreshed.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The company logo could not be uploaded.",
      );
    } finally {
      setLogoUploadProgress(null);
    }
  }

  async function handleRemoveLogo() {
    if (!token || user?.role !== "employer") return;
    setError(null);
    setIsRemovingLogo(true);
    try {
      await employerVerificationFilesApi.deleteLogo(token);
      setLogoUrl(null);
      setDraft((current) => ({ ...current, logo: null }));
      try {
        companyVerificationApi.setCompanyMedia({
          ...savedMedia,
          logo: null,
        });
      } catch {
        setError("Logo removed, but the local profile preview could not be refreshed.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The company logo could not be removed.",
      );
    } finally {
      setIsRemovingLogo(false);
    }
  }

  function beginEditing() {
    resetDraft();
    setIsEditing(true);
  }

  return (
    <section
      aria-labelledby="company-media-manager-heading"
      className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(27,54,52,0.03)] md:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-[#1d3034]" id="company-media-manager-heading">
            Company media
          </h2>
          <p className="mt-1 text-[9px] text-[#829091]">
            Company logos are uploaded to the backend. Photo gallery entries are demo-only and not stored on the server.
          </p>
        </div>
        {!isEditing ? (
          <button
            className="shrink-0 text-[10px] font-semibold text-[#087879] underline underline-offset-2"
            onClick={beginEditing}
            type="button"
          >
            Edit media
          </button>
        ) : null}
      </div>
      {error && (
        <p className="mt-3 text-[10px] text-[#b34840]" role="alert">
          {error}
        </p>
      )}

      {!isEditing ? (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-[10px] font-semibold text-[#526365]">Company logo</h3>
            {logoUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  alt="Company logo"
                  className="size-12 rounded-lg border border-[#e7eeee] object-cover"
                  src={logoUrl}
                />
                <button
                  className="text-[9px] font-semibold text-[#a2534c] underline underline-offset-2"
                  disabled={isRemovingLogo || logoUploadProgress !== null}
                  onClick={() => void handleRemoveLogo()}
                  type="button"
                >
                  {isRemovingLogo ? "Removing…" : "Remove logo"}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[9px] text-[#849394]">No logo added</p>
            )}
            <label className="mt-2 block text-[9px] font-semibold text-[#087879]">
              {logoUrl ? "Replace logo" : "Upload logo"} · JPG, PNG, or WebP · up to 2 MB
              <input
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-[9px] text-[#526365]"
                disabled={logoUploadProgress !== null || isRemovingLogo}
                onChange={(event) => {
                  void handleLogoUpload(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            {logoUploadProgress !== null && (
              <p className="mt-1 text-[9px] text-[#087879]" role="status">
                Uploading logo… {logoUploadProgress}%
              </p>
            )}
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-[#526365]">
              Photos <span className="font-normal text-[#849394]">({savedMedia.gallery.length})</span>
            </h3>
            {savedMedia.gallery.length ? (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {savedMedia.gallery.map((photo) => (
                  <li className="min-w-0" key={photo.id}>
                    <img
                      alt={photo.altText}
                      className="aspect-[4/3] w-full rounded-lg border border-[#e7eeee] object-cover"
                      src={photo.url}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[9px] text-[#849394]">No company photos added</p>
            )}
          </div>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSave}>
          <fieldset className="space-y-3 border-t border-[#edf1f1] pt-3">
            <legend className="text-[10px] font-semibold text-[#526365]">Company photos</legend>
            {draft.gallery.map((photo, index) => (
              <div className="space-y-2 rounded-lg border border-[#edf1f0] p-2.5" key={photo.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-semibold text-[#526365]">Photo {index + 1}</span>
                  <button
                    aria-label={`Remove photo ${index + 1}`}
                    className="text-[9px] font-semibold text-[#a2534c] underline underline-offset-2"
                    onClick={() => setDraft((current) => ({
                      ...current,
                      gallery: current.gallery.filter((item) => item.id !== photo.id),
                    }))}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-[9px] text-[#718082]">
                  Image URL
                  <input
                    className="mt-1 w-full rounded-lg border border-[#dfe8e7] px-2.5 py-2 text-[10px] text-[#344749] outline-none focus:border-[#078b8d]"
                    onChange={(event) => updatePhoto(photo.id, "url", event.currentTarget.value)}
                    placeholder="https://example.com/photo.png"
                    value={photo.url}
                  />
                </label>
                <label className="block text-[9px] text-[#718082]">
                  Description
                  <input
                    className="mt-1 w-full rounded-lg border border-[#dfe8e7] px-2.5 py-2 text-[10px] text-[#344749] outline-none focus:border-[#078b8d]"
                    onChange={(event) => updatePhoto(photo.id, "altText", event.currentTarget.value)}
                    placeholder="Describe the photo"
                    value={photo.altText}
                  />
                </label>
              </div>
            ))}
            <button
              className="rounded-lg border border-dashed border-[#cbdcda] px-3 py-2 text-[9px] font-semibold text-[#087879]"
              onClick={() => setDraft((current) => ({ ...current, gallery: [...current.gallery, makeAsset()] }))}
              type="button"
            >
              Add photo
            </button>
          </fieldset>

          <p className="text-[9px] leading-4 text-[#849394]">
            Gallery changes in this demo are saved only in this browser.
          </p>
          <div className="flex justify-end gap-2 border-t border-[#edf1f1] pt-3">
            <button
              className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-[9px] font-semibold text-[#526365]"
              onClick={() => {
                setDraft(savedMedia);
                setError(null);
                setIsEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-[#0d8fa2] px-3 py-2 text-[9px] font-semibold text-white"
              type="submit"
            >
              Save media
            </button>
          </div>
        </form>
      )}
    </section>
  );
}