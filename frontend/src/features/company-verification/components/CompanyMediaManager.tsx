import { useEffect, useRef, useState } from "react";
import { companyVerificationApi } from "@/features/company-verification/api";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";
import { useAuth } from "@/features/auth/useAuth";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";
import type { CompanyMediaCollection } from "@/features/company-profile/types";

const emptyMedia: CompanyMediaCollection = {
  logo: null,
  banner: null,
  gallery: [],
  videoUrl: "",
  coverImageId: null,
};

export default function CompanyMediaManager() {
  const { user, token } = useAuth();
  const verification = useCompanyVerification();
  const savedMedia = verification.record.media ?? emptyMedia;
  const savedMediaRef = useRef(savedMedia);
  const employerId = user?.role === "employer" ? String(user.id) : undefined;
  const [draft, setDraft] = useState<CompanyMediaCollection>(savedMedia);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(savedMedia.logo?.url ?? null);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [photoAltText, setPhotoAltText] = useState("");
  const [photoUploadProgress, setPhotoUploadProgress] = useState<number | null>(null);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    savedMediaRef.current = savedMedia;
  }, [savedMedia]);

  useEffect(() => {
    if (!token || user?.role !== "employer") return;
    let active = true;
    employerVerificationFilesApi
      .company(token)
      .then(({ company }) => {
        if (!active) return;
        const backendLogoUrl = company?.logo_url ?? null;
        const backendGallery = (company?.media ?? []).map((photo) => ({
          id: String(photo.id),
          url: photo.url,
          altText: photo.alt_text,
        }));
        const currentMedia = savedMediaRef.current;
        const galleryMatches = currentMedia.gallery.length === backendGallery.length &&
          currentMedia.gallery.every((photo, index) =>
            photo.id === backendGallery[index].id &&
            photo.url === backendGallery[index].url &&
            photo.altText === backendGallery[index].altText,
          );
        setLogoUrl(backendLogoUrl);
        window.dispatchEvent(new CustomEvent("careerconnect-employer-logo-changed", {
          detail: backendLogoUrl,
        }));
        if ((currentMedia.logo?.url ?? null) !== backendLogoUrl || !galleryMatches) {
          companyVerificationApi.setCompanyMedia({
            ...currentMedia,
            logo: backendLogoUrl
              ? { id: "server-company-logo", url: backendLogoUrl, altText: "Company logo" }
              : null,
            gallery: backendGallery,
          }, String(user.id));
        }
        setDraft((current) => ({
          ...current,
          logo: backendLogoUrl
            ? { id: "server-company-logo", url: backendLogoUrl, altText: "Company logo" }
            : null,
          gallery: backendGallery,
        }));
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
  }, [token, user?.id, user?.role]);

  const resetDraft = () => {
    setDraft(savedMedia);
    setError(null);
  };

  async function handlePhotoUpload(file?: File) {
    if (!file) return;
    if (!token || !employerId) {
      setError("Sign in with an employer account before uploading company photos.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Each company photo must be larger than 0 bytes and no more than 5 MB.");
      return;
    }
    if (savedMedia.gallery.length >= 12) {
      setError("You can upload up to 12 company photos.");
      return;
    }
    if (!photoAltText.trim()) {
      setError("Add a short description for this photo.");
      return;
    }

    setError(null);
    setPhotoUploadProgress(0);
    try {
      const uploaded = await employerVerificationFilesApi.uploadCompanyMedia(
        token,
        file,
        photoAltText.trim(),
        setPhotoUploadProgress,
      );
      const nextGallery = [
        ...savedMediaRef.current.gallery,
        { id: String(uploaded.id), url: uploaded.url, altText: uploaded.alt_text },
      ];
      const nextMedia = { ...savedMediaRef.current, gallery: nextGallery };
      companyVerificationApi.setCompanyMedia(nextMedia, employerId);
      setDraft(nextMedia);
      setPhotoAltText("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The company photo could not be uploaded.",
      );
    } finally {
      setPhotoUploadProgress(null);
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!token || !employerId) {
      setError("Sign in with an employer account before removing company photos.");
      return;
    }

    setError(null);
    setRemovingPhotoId(photoId);
    try {
      await employerVerificationFilesApi.deleteCompanyMedia(token, photoId);
      const nextMedia = {
        ...savedMediaRef.current,
        gallery: savedMediaRef.current.gallery.filter((photo) => photo.id !== photoId),
      };
      companyVerificationApi.setCompanyMedia(nextMedia, employerId);
      setDraft(nextMedia);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The company photo could not be removed.",
      );
    } finally {
      setRemovingPhotoId(null);
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
      window.dispatchEvent(new CustomEvent("careerconnect-employer-logo-changed", {
        detail: uploadedUrl,
      }));
      setDraft((current) => ({
        ...current,
        logo: {
          id: current.logo?.id ?? "server-company-logo",
          url: uploadedUrl,
          altText: "Company logo",
        },
      }));
      companyVerificationApi.setCompanyMedia({
        ...savedMediaRef.current,
        logo: {
          id: "server-company-logo",
          url: uploadedUrl,
          altText: "Company logo",
        },
      }, employerId);
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
      window.dispatchEvent(new CustomEvent("careerconnect-employer-logo-changed", {
        detail: null,
      }));
      setDraft((current) => ({ ...current, logo: null }));
      companyVerificationApi.setCompanyMedia({
        ...savedMediaRef.current,
        logo: null,
      }, employerId);
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
            Upload a company logo and up to 12 company photos. Photos are saved to your company profile.
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
                  decoding="async"
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
                      decoding="async"
                      loading="lazy"
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
        <div className="mt-4 space-y-4">
          <fieldset className="space-y-3 border-t border-[#edf1f1] pt-3">
            <legend className="text-[10px] font-semibold text-[#526365]">Company photos</legend>
            <label className="block text-[9px] text-[#718082]">
              Photo description
              <input
                className="mt-1 w-full rounded-lg border border-[#dfe8e7] px-2.5 py-2 text-[10px] text-[#344749] outline-none focus:border-[#078b8d]"
                maxLength={255}
                onChange={(event) => setPhotoAltText(event.currentTarget.value)}
                placeholder="Describe the photo for accessibility"
                value={photoAltText}
              />
            </label>
            <label className="block text-[9px] font-semibold text-[#087879]">
              Upload photo · JPG, PNG, or WebP · up to 5 MB
              <input
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-[9px] text-[#526365]"
                disabled={
                  photoUploadProgress !== null ||
                  removingPhotoId !== null ||
                  draft.gallery.length >= 12
                }
                onChange={(event) => {
                  void handlePhotoUpload(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            {photoUploadProgress !== null ? (
              <p className="text-[9px] text-[#087879]" role="status">
                Uploading photo… {photoUploadProgress}%
              </p>
            ) : null}
            {draft.gallery.length >= 12 ? (
              <p className="text-[9px] text-[#718082]">Photo limit reached (12).</p>
            ) : null}
            {draft.gallery.map((photo, index) => (
              <div className="flex items-center gap-3 rounded-lg border border-[#edf1f0] p-2.5" key={photo.id}>
                <img
                  alt={photo.altText}
                  className="size-14 shrink-0 rounded-md border border-[#e7eeee] object-cover"
                  decoding="async"
                  loading="lazy"
                  src={photo.url}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-medium text-[#526365]">{photo.altText}</p>
                  <p className="text-[8px] text-[#849394]">Photo {index + 1}</p>
                </div>
                  <button
                    aria-label={`Remove photo ${index + 1}`}
                    className="text-[9px] font-semibold text-[#a2534c] underline underline-offset-2"
                    disabled={photoUploadProgress !== null || removingPhotoId !== null}
                    onClick={() => void handleRemovePhoto(photo.id)}
                    type="button"
                  >
                    {removingPhotoId === photo.id ? "Removing…" : "Remove"}
                  </button>
              </div>
            ))}
          </fieldset>

          <p className="text-[9px] leading-4 text-[#849394]">
            Photo uploads and removals are saved immediately.
          </p>
          <div className="flex justify-end gap-2 border-t border-[#edf1f1] pt-3">
            <button
              className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-[9px] font-semibold text-[#526365]"
              onClick={() => {
                setDraft(savedMedia);
                setError(null);
                setPhotoAltText("");
                setIsEditing(false);
              }}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}