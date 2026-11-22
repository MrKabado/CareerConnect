import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "react-router";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";
import { formatListingPay, publicJobsApi } from "@/features/jobs/backendApi";
import {
  savedOpportunityStore,
  type SavedOpportunityType,
} from "@/features/jobs/savedOpportunities";

type SavedOffer = {
  id: string;
  type: SavedOpportunityType;
  title: string;
  company: string;
  initials: string;
  details: string[];
};

function SavedOfferActions({ offer }: { offer: SavedOffer }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Actions for ${offer.title}`}
        className="grid size-8 place-items-center rounded-lg text-[#718184] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="3" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="8" cy="13" r="1.25" />
        </svg>
      </button>
      {isOpen && (
        <div
          aria-label={`${offer.title} actions`}
          className="absolute top-full right-0 z-30 mt-1 w-36 rounded-lg border border-[#e5eeec] bg-white p-1 shadow-[0_8px_24px_rgba(27,54,52,0.14)]"
          role="menu"
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[10px] font-medium text-[#a2534c] hover:bg-[#fff5f4] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
            onClick={() => savedOpportunityStore.toggle(offer.type, offer.id)}
            role="menuitem"
            type="button"
          >
            Unsave
          </button>
        </div>
      )}
    </div>
  );
}

export default function SavedOpportunitiesModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const savedIds = useSyncExternalStore(
    savedOpportunityStore.subscribe,
    savedOpportunityStore.getSnapshot,
    () => [],
  );
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all(
      savedIds.map(async (key): Promise<SavedOffer | null> => {
        const [type, rawId] = key.split(":");
        if (type !== "job" && type !== "ojt") return null;
        try {
          const listing = await publicJobsApi.show(Number(rawId));
          const company = listing.company?.name ?? "Company unavailable";
          return {
            id: String(listing.id),
            type,
            title: listing.title,
            company,
            initials: company.slice(0, 1).toUpperCase(),
            details: [
              listing.location,
              listing.work_setup === "onsite"
                ? "On-site"
                : listing.work_setup.charAt(0).toUpperCase() + listing.work_setup.slice(1),
              formatListingPay(listing),
            ].filter(Boolean),
          };
        } catch {
          return null;
        }
      }),
    ).then((offers) => {
      if (active) setSavedOffers(offers.filter((offer): offer is SavedOffer => offer !== null));
    });

    return () => {
      active = false;
    };
  }, [savedIds]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <button
        aria-label="Close saved offers"
        className="absolute inset-0 size-full cursor-default bg-[#1f3333]/35"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="saved-offers-title"
        aria-modal="true"
        className="relative z-10 flex h-[min(82dvh,680px)] max-h-[calc(100dvh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] border border-[#e5eeec] bg-[#f7faf9] shadow-[0_16px_48px_rgba(27,54,52,0.2)]"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e4ecea] bg-white px-5 py-4">
          <div>
            <h2
              className="text-[16px] font-bold text-[#293d3e]"
              id="saved-offers-title"
            >
              Saved offers
            </h2>
            <p className="mt-1 text-[10px] text-[#829092]">
              {savedOffers.length} bookmarked {savedOffers.length === 1 ? "offer" : "offers"}
            </p>
          </div>
          <button
            aria-label="Close saved offers"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[20px] leading-none text-[#718184] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        {savedOffers.length > 0 ? (
          <ul className="flex-1 space-y-2 overflow-y-auto p-4">
            {savedOffers.map((offer) => (
              <li
                className="flex items-center gap-3 rounded-xl border border-[#e5eeec] bg-white p-3"
                key={`${offer.type}:${offer.id}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e6f6f3] text-[12px] font-bold text-[#178b87]">
                  {offer.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-[12px] font-semibold text-[#354346]">
                      {offer.title}
                    </h3>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${
                        offer.type === "ojt"
                          ? "bg-[#fff0dc] text-[#bd852d]"
                          : "bg-[#e4f5f2] text-[#28847f]"
                      }`}
                    >
                      {offer.type === "ojt" ? "OJT" : "Job"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#647779]">
                    {offer.company}
                  </p>
                  {offer.details.length > 0 && (
                    <p className="mt-1 truncate text-[9px] text-[#879596]">
                      {offer.details.join(" · ")}
                    </p>
                  )}
                  <Link
                    className="mt-1 inline-flex text-[9px] font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                    onClick={onClose}
                    to={getCompanyProfileUrl(offer.company)}
                  >
                    View company
                  </Link>
                </div>
                <SavedOfferActions offer={offer} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid flex-1 place-content-center px-6 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#eaf6ed] text-[#27834b]">
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h12v17l-6-4-6 4V4Z" />
              </svg>
            </span>
            <h3 className="mt-3 text-[13px] font-semibold text-[#354749]">
              No saved offers yet
            </h3>
            <p className="mt-1 max-w-[260px] text-[10px] leading-4 text-[#829092]">
              Bookmark a job or OJT offer to keep it here for later.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}