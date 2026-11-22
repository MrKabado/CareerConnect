import { useEffect, useState } from "react";
import { Link } from "react-router";
import { onboardingStore } from "@/features/onboarding/store";
import { useAuth } from "@/features/auth/useAuth";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";

export default function HomePage() {
  const hasSavedDraft = onboardingStore.getSnapshot().accountCreated;
  const { user, token, status: authStatus } = useAuth();
  const [employerVerificationState, setEmployerVerificationState] = useState<{
    userId: number;
    pending: boolean;
    error: string | null;
  } | null>(null);
  const isAuthenticatedEmployer =
    authStatus === "authenticated" && user?.role === "employer" && Boolean(token);

  useEffect(() => {
    if (!isAuthenticatedEmployer || !token || !user) return;

    let active = true;
    employerVerificationFilesApi
      .status(token)
      .then((response) => {
        if (active) {
          setEmployerVerificationState({
            userId: user.id,
            pending: response.status === "pending",
            error: null,
          });
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setEmployerVerificationState({
            userId: user.id,
            pending: false,
            error:
              requestError instanceof Error
                ? requestError.message
                : "Unable to load your company verification status.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticatedEmployer, token, user]);

  const hasCurrentEmployerStatus =
    isAuthenticatedEmployer && employerVerificationState?.userId === user?.id;

  return (
    <main className="bg-[#f5f8f8] px-4 py-12 text-[#263a3c] sm:px-6 sm:py-16">
      {hasCurrentEmployerStatus && employerVerificationState.pending && (
        <section
          aria-live="polite"
          className="mx-auto mb-6 max-w-6xl rounded-2xl border border-[#f1dfb8] bg-[#fff9eb] p-5 text-[#6b542b]"
          role="status"
        >
          <h2 className="text-sm font-bold">Company verification under review</h2>
          <p className="mt-1 text-sm leading-6">
            Your company verification request is pending approval. The status is saved to your employer account, and employer features will remain unavailable until a decision is made.
          </p>
          <Link
            className="mt-2 inline-block text-sm font-semibold underline underline-offset-2"
            to="/employer/under-review"
          >
            View verification status
          </Link>
        </section>
      )}
      {hasCurrentEmployerStatus && employerVerificationState.error && (
        <p
          className="mx-auto mb-6 max-w-6xl rounded-xl border border-[#f1d8d5] bg-[#fff7f6] p-4 text-sm text-[#9b4e48]"
          role="alert"
        >
          {employerVerificationState.error}
        </p>
      )}
      <section className="mx-auto grid max-w-6xl items-center gap-10 rounded-3xl border border-[#e6eeee] bg-white px-6 py-10 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#078b8d]">
            CareerConnect
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Find your next opportunity.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#687b7e]">
            Explore job openings and on-the-job training opportunities, then
            choose the next step that fits your goals.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#078b8d] px-5 text-sm font-semibold text-white hover:bg-[#06787a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d]"
              to="/job-search"
            >
              Browse jobs
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d7e4e3] bg-white px-5 text-sm font-semibold text-[#263a3c] hover:bg-[#f5f8f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d]"
              to="/ojt-search"
            >
              Explore OJT
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-2xl border border-[#e6eeee] bg-[#f7fbfa] p-5">
            <h2 className="text-base font-semibold">For job seekers</h2>
            <p className="mt-2 text-sm leading-6 text-[#687b7e]">
              Search roles, save opportunities, and keep track of your
              applications.
            </p>
            <Link
              className="mt-4 inline-flex text-sm font-semibold text-[#078b8d] hover:underline"
              to="/onboarding"
            >
              {hasSavedDraft ? "Continue your profile setup" : "Set up your profile"}
            </Link>
          </article>
          <article className="rounded-2xl border border-[#e6eeee] bg-[#f7fbfa] p-5">
            <h2 className="text-base font-semibold">For employers</h2>
            <p className="mt-2 text-sm leading-6 text-[#687b7e]">
              Create a company account to prepare listings and connect with
              applicants.
            </p>
            <Link
              className="mt-4 inline-flex text-sm font-semibold text-[#078b8d] hover:underline"
              to="/employer/register"
            >
              Register your company
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
