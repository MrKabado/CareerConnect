import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6 py-16 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#078b8d]">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#263a3c]">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-3 text-sm text-[#687b7e]">
          The link may be outdated, or the page may have moved.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-[#078b8d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#06787a]"
          to="/job-search"
        >
          Browse opportunities
        </Link>
      </div>
    </main>
  );
}
