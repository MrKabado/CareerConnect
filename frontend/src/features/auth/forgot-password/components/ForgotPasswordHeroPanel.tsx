import { Link } from "react-router";
import { FORGOT_PASSWORD_OFFICE_PHOTO } from "@/features/auth/forgot-password/constants";

function BrandMark() {
  return (
    <Link
      to="/"
      className="relative z-10 inline-flex w-fit items-center gap-2.5 rounded-lg text-[15px] font-semibold tracking-[-0.3px] text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#77d6cf]"
      aria-label="CareerConnect home"
    >
      <span className="grid size-9 place-items-center rounded-[10px] bg-white/15 backdrop-blur-sm">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4.5"
          fill="none"
        >
          <rect
            x="4"
            y="7"
            width="16"
            height="12"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7M4.5 11h15M10 11v1.5h4V11"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        Career<span className="text-[#19b8ad]">Connect</span>
      </span>
    </Link>
  );
}

export function ForgotPasswordHeroPanel() {
  return (
    <section className="relative flex min-h-full flex-col justify-between overflow-hidden bg-[#073f40] p-8 text-white max-[760px]:p-6 max-[520px]:hidden">
      <img src={FORGOT_PASSWORD_OFFICE_PHOTO} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,51,50,0.4)_0%,rgba(0,36,37,0.18)_38%,rgba(0,31,32,0.88)_100%)]" />
      <BrandMark />

      <div className="relative z-10 mb-2 max-w-[27rem]">
        <span className="mb-5 block h-0.75 w-10 rounded-full bg-[#14b8ac]" />
        <h1 className="max-w-[24rem] text-[clamp(25px,3vw,38px)] leading-[1.14] font-semibold tracking-[-1.2px] max-[760px]:text-[23px]">
          Secure your account.
        </h1>
        <p className="mt-4 max-w-[23rem] text-[14px] leading-[1.65] text-white/80 max-[760px]:mt-3 max-[760px]:text-[12px]">
          Reset your password in a few steps and get back to building your next opportunity.
        </p>
        <div className="mt-7 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-0.75 w-8 rounded-full bg-white" />
          <span className="h-0.75 w-5 rounded-full bg-white/40" />
          <span className="h-0.75 w-5 rounded-full bg-white/40" />
        </div>
      </div>

      <p className="relative z-10 text-[10px] text-white/65">Photo via Unsplash</p>
    </section>
  );
}
