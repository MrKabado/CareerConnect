import { Link } from "react-router";

export default function HomePage() {
  return (
    <main className="bg-[#f5f8f8] px-4 py-12 text-[#263a3c] sm:px-6 sm:py-16">
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
              Set up your profile
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
