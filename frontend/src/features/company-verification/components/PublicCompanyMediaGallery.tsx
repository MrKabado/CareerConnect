import type { CompanyMediaCollection } from "@/features/company-profile/types";

export default function PublicCompanyMediaGallery({
  media,
}: {
  media?: CompanyMediaCollection;
}) {
  const photos = media?.gallery ?? [];

  if (!photos.length) return null;

  return (
    <section
      aria-labelledby="company-media-heading"
      className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]"
    >
      <h2 className="text-[13px] font-bold text-[#2d4244]" id="company-media-heading">
        Inside the company
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <li className="overflow-hidden rounded-xl border border-[#e7eeee]" key={photo.id}>
            <img
              alt={photo.altText}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
              src={photo.url}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}