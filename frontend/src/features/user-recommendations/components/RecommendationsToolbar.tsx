import type { RecommendationSort } from "@/features/user-recommendations/hooks/useUserRecommendations";

type RecommendationsToolbarProps = {
  setShowSavedOnly: (value: boolean | ((current: boolean) => boolean)) => void;
  setSort: (value: RecommendationSort) => void;
  showSavedOnly: boolean;
  sort: RecommendationSort;
  savedOpportunitiesCount: number;
};

export default function RecommendationsToolbar({
  savedOpportunitiesCount,
  setShowSavedOnly,
  setSort,
  showSavedOnly,
  sort,
}: RecommendationsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-pressed={showSavedOnly}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-semibold focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${showSavedOnly ? "border-[#9ed2aa] bg-[#eaf6ed] text-[#237a42]" : "border-[#e5ebeb] bg-white text-[#66787a] hover:border-[#b9ddda]"}`}
        onClick={() => setShowSavedOnly((savedOnly) => !savedOnly)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
        >
          <path d="M6 4h12v17l-6-4-6 4V4Z" />
        </svg>
        Saved ({savedOpportunitiesCount})
      </button>
      <label className="relative flex w-[152px] items-center">
        <span className="sr-only">Sort recommendations</span>
        <select
          className="h-9 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[29px] pl-3 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
          onChange={(event) =>
            setSort(
              event.target.value === "most-recent" ? "most-recent" : "best-match",
            )
          }
          value={sort}
        >
          <option value="best-match">Best match</option>
          <option value="most-recent">Most recent</option>
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-[10px] size-[15px] text-[#849394]"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </label>
    </div>
  );
}
