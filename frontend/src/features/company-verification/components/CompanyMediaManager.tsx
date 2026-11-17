import { useState, type FormEvent } from "react";
import { companyVerificationApi } from "@/features/company-verification/api";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";
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
  const verification = useCompanyVerification();
  const savedMedia = verification.record.media ?? emptyMedia;
  const [draft, setDraft] = useState<CompanyMediaCollection>(savedMedia);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDraft = () => {
    setDraft(savedMedia);
    setError(null);
  };

  function updateLogo(field: "url" | "altText", value: string) {
    setDraft((current) => {
      const logo = current.logo ?? makeAsset();
      return {
        ...current,
        logo: {
          ...logo,
          [field]: value,
        },
      };
    });
  }

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
    const assets = [draft.logo, ...draft.gallery].filter(
      (asset): asset is CompanyMediaAsset => asset !== null,
    );
    if (assets.some((asset) => !isImageUrl(asset.url.trim()) || !asset.altText.trim())) {
      setError("Add a valid image URL and descriptive alt text for each image.");
      return;
    }

    try {
      companyVerificationApi.setCompanyMedia(draft);
      setError(null);
      setIsEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save company media.",
      );
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
            Saved logo and photos appear on your public profile immediately.
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

      {!isEditing ? (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-[10px] font-semibold text-[#526365]">Company logo</h3>
            {savedMedia.logo ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  alt={savedMedia.logo.altText}
                  className="size-12 rounded-lg border border-[#e7eeee] object-cover"
                  src={savedMedia.logo.url}
                />
              </div>
            ) : (
              <p className="mt-1 text-[9px] text-[#849394]">No logo added</p>
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
          <fieldset className="space-y-2">
            <legend className="text-[10px] font-semibold text-[#526365]">Company logo</legend>
            <label className="block text-[9px] text-[#718082]">
              Image URL
              <input
                className="mt-1 w-full rounded-lg border border-[#dfe8e7] px-2.5 py-2 text-[10px] text-[#344749] outline-none focus:border-[#078b8d]"
                onChange={(event) => updateLogo("url", event.currentTarget.value)}
                placeholder="https://example.com/logo.png"
                value={draft.logo?.url ?? ""}
              />
            </label>
            <label className="block text-[9px] text-[#718082]">
              Description
              <input
                className="mt-1 w-full rounded-lg border border-[#dfe8e7] px-2.5 py-2 text-[10px] text-[#344749] outline-none focus:border-[#078b8d]"
                onChange={(event) => updateLogo("altText", event.currentTarget.value)}
                placeholder="Company logo"
                value={draft.logo?.altText ?? ""}
              />
            </label>
          </fieldset>

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
            Saved changes are displayed on the public company profile immediately.
          </p>
          {error ? <p className="text-[9px] text-[#b34840]" role="alert">{error}</p> : null}
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