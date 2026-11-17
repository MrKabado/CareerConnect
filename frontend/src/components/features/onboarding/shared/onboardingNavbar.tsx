export default function OnboardingNavbar() {
  return (
    <header className="h-[66px] shrink-0 border-b border-[#e7eeee] bg-white max-[600px]:h-12">
      <div className="mx-auto flex h-full w-full max-w-[1180px] items-center justify-between px-5 max-[600px]:px-4">
        <a
          aria-label="CareerConnect home"
          className="inline-flex items-center gap-2.5 rounded-lg text-[17px] font-bold tracking-[-0.55px] text-[#263538] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#078b8d] max-[600px]:gap-1.5 max-[600px]:text-[14px]"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-[11px] bg-[#008b98] text-white shadow-[0_4px_10px_rgba(0,128,139,0.2)] max-[600px]:size-7 max-[600px]:rounded-lg">
            <svg
              aria-hidden="true"
              className="size-[18px] max-[600px]:size-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <rect
                x="4"
                y="7"
                width="16"
                height="12"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7M4.5 11h15M10 11v1.5h4V11"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          </span>
          <span>
            Career<span className="text-[#078b8d]">Connect</span>
          </span>
        </a>

        <p className="text-xs text-[#7b898b] max-[430px]:text-[10px]">
          Already have an account?{" "}
          <a
            className="ml-2 font-semibold text-[#078b8d] hover:text-[#066f72] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d]"
            href="/login"
          >
            Sign in
          </a>
        </p>
      </div>
    </header>
  );
}