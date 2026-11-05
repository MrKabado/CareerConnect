import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import {
  getCompanyRatingSummary,
  saveCompanyRating,
  type CompanyRatingSummary,
} from "@/features/companies/companyRatings";

const ratingLabels = [
  "Very dissatisfied",
  "Dissatisfied",
  "It's okay",
  "Satisfied",
  "Very satisfied",
];

export default function CompanyRatingPanel({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName: string;
}) {
  const { status, token, user, error: authError, refresh } = useAuth();
  const [summary, setSummary] = useState<CompanyRatingSummary | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [loadedRatingKey, setLoadedRatingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const ratingKey = `${companySlug}:${token ?? ""}`;
  const isLoading = loadedRatingKey !== ratingKey;
  const currentSummary = isLoading ? null : summary;

  useEffect(() => {
    let active = true;

    getCompanyRatingSummary(companySlug, token ?? undefined)
      .then((result) => {
        if (!active) return;
        setSummary(result);
        setRating(result.user_rating?.rating ?? 0);
        setReview(result.user_rating?.review ?? "");
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setSummary(null);
        setError(
          requestError instanceof TypeError
            ? "Cannot connect to the ratings service. Make sure the backend is running."
            : requestError instanceof Error
              ? requestError.message
              : "Unable to load company ratings.",
        );
      })
      .finally(() => {
        if (active) setLoadedRatingKey(ratingKey);
      });

    return () => {
      active = false;
    };
  }, [companySlug, ratingKey, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || rating < 1 || rating > 5) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await saveCompanyRating(
        companySlug,
        rating,
        review,
        token,
      );
      setSummary(result);
      setSuccess("Thanks for sharing your experience.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save your rating.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canRate = status === "authenticated" && user?.role === "applicant";
  const isEditing =
    currentSummary?.user_rating !== null &&
    currentSummary?.user_rating !== undefined;

  return (
    <section
      aria-labelledby="company-rating-title"
      className="rounded-[16px] border border-[#e8eeee] bg-white p-4 shadow-[0_5px_16px_rgba(39,85,82,0.04)]"
    >
      <h2
        className="text-[13px] font-bold text-[#2d4244]"
        id="company-rating-title"
      >
        Rate your experience
      </h2>
      <p className="mt-1 text-[9px] leading-[1.5] text-[#809091]">
        Share how satisfied you are with {companyName}.
      </p>

      <fieldset className="mt-4" disabled={isSaving}>
        <div
          aria-label="Choose from one to five stars"
          className="flex items-center gap-1"
          onMouseLeave={() => setHoveredRating(0)}
          role="group"
        >
          {ratingLabels.map((label, index) => {
            const value = index + 1;
            const displayedRating = hoveredRating || rating;
            return (
              <button
                aria-label={`${value} out of 5 stars: ${label}`}
                aria-pressed={rating === value}
                className={`grid size-9 place-items-center rounded-lg text-[25px] leading-none transition-all hover:scale-110 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${
                  displayedRating >= value
                    ? "text-[#e2a632]"
                    : "text-[#cbd5d5] hover:text-[#e2a632]"
                }`}
                key={value}
                onClick={() => {
                  setRating(value);
                  setHoveredRating(0);
                  setSuccess(null);
                }}
                onFocus={() => setHoveredRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onBlur={() => setHoveredRating(0)}
                type="button"
              >
                ★
              </button>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-1 text-[9px] font-medium text-[#718184]" aria-live="polite">
        {hoveredRating
          ? ratingLabels[hoveredRating - 1]
          : rating
            ? ratingLabels[rating - 1]
            : "Choose a rating"}
      </p>

      {isLoading ? (
        <p className="mt-4 text-[9px] text-[#809091]" role="status">
          Loading ratings…
        </p>
      ) : (
        <>
          {status === "loading" && (
            <p className="mt-4 text-[9px] text-[#809091]" role="status">
              Checking your account…
            </p>
          )}

          {status === "error" && (
            <div className="mt-4">
              <p className="text-[9px] text-red-700" role="alert">
                {authError ?? "Unable to verify your account."}
              </p>
              <button
                className="mt-2 text-[9px] font-semibold text-[#078b98] hover:underline"
                onClick={() => void refresh()}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {status === "unauthenticated" && (
            <p className="mt-4 text-[9px] text-[#718184]">
              <Link
                className="font-semibold text-[#078b98] hover:underline"
                to="/login"
              >
                Sign in
              </Link>{" "}
              to submit your rating.
            </p>
          )}

          {status === "authenticated" && user?.role !== "applicant" && (
            <p className="mt-4 text-[9px] text-[#718184]">
              Company ratings are available to applicant accounts.
            </p>
          )}

          {canRate && (
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <label className="block text-[9px] font-semibold text-[#526365]">
                Your review <span className="font-normal text-[#829091]">(optional)</span>
                <textarea
                  className="mt-1.5 min-h-20 w-full resize-y rounded-[9px] border border-[#dce7e6] bg-white px-3 py-2 text-[10px] font-normal text-[#263a3c] outline-none placeholder:text-[#9aa8a8] focus:border-[#078b98] focus:ring-2 focus:ring-[#078b98]/15 disabled:opacity-60"
                  maxLength={1000}
                  onChange={(event) => {
                    setReview(event.target.value);
                    setSuccess(null);
                  }}
                  placeholder="What went well, or what could be better?"
                  value={review}
                />
              </label>

              {error && (
                <p className="text-[9px] text-red-700" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-[9px] text-[#24877c]" role="status">
                  {success}
                </p>
              )}

              <button
                className="rounded-[8px] bg-[#078b98] px-3 py-2 text-[9px] font-semibold text-white hover:bg-[#067983] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={rating === 0 || isSaving}
                type="submit"
              >
                {isSaving
                  ? "Saving…"
                  : isEditing
                    ? "Update rating"
                    : "Submit rating"}
              </button>
            </form>
          )}

          {error && !canRate && (
            <p className="mt-3 text-[9px] text-[#829091]" role="status">
              Ratings are temporarily unavailable.
            </p>
          )}
        </>
      )}
    </section>
  );
}
