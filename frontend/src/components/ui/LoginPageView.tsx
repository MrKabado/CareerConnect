import type { FormEventHandler } from "react";
import { Link } from "react-router";
import AuthProviderButton from "@/components/ui/auth-provider-button";

const officePhoto =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85";

type LoginPageViewProps = {
  loginError: string | null;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

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

function LoginHeroPanel() {
  return (
    <section className="relative flex min-h-full flex-col justify-between overflow-hidden bg-[#073f40] p-8 text-white max-[760px]:p-6 max-[520px]:hidden">
      <img
        src={officePhoto}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,51,50,0.4)_0%,rgba(0,36,37,0.18)_38%,rgba(0,31,32,0.88)_100%)]" />
      <BrandMark />

      <div className="relative z-10 mb-2 max-w-110">
        <span className="mb-5 block h-0.75 w-10 rounded-full bg-[#14b8ac]" />
        <h1 className="max-w-97.5 text-[clamp(25px,3vw,38px)] leading-[1.14] font-semibold tracking-[-1.2px] max-[760px]:text-[23px]">
          Your next chapter starts here.
        </h1>
        <p className="mt-4 max-w-92.5 text-[14px] leading-[1.65] text-white/80 max-[760px]:mt-3 max-[760px]:text-[12px]">
          Join a trusted community where ambitious people and thoughtful
          companies find each other.
        </p>
        <div className="mt-7 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-0.75 w-8 rounded-full bg-white" />
          <span className="h-0.75 w-5 rounded-full bg-white/40" />
          <span className="h-0.75 w-5 rounded-full bg-white/40" />
        </div>
      </div>

      <p className="relative z-10 text-[10px] text-white/65">
        Photo via Unsplash
      </p>
    </section>
  );
}

function LoginHeader() {
  return (
    <header className="mb-7 max-[760px]:mb-3">
      <h2 className="text-[30px] leading-tight font-semibold tracking-[-1px] text-[#263538] max-[760px]:text-[21px]">
        Welcome!
      </h2>
      <p className="mt-2 text-[13px] text-[#748184] max-[760px]:mt-1 max-[760px]:text-[11px]">
        New to CareerConnect?{" "}
        <Link
          to="/onboarding"
          className="font-semibold text-[#078b8d] underline decoration-[#078b8d]/40 underline-offset-2 hover:text-[#066f72] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d]"
        >
          Create an account
        </Link>
      </p>
    </header>
  );
}

function LoginCredentialsForm({
  loginError,
  isSubmitting,
  onSubmit,
}: {
  loginError: string | null;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form
      className="space-y-4.25 max-[760px]:space-y-2"
      onSubmit={onSubmit}
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-[12px] font-medium text-[#354346] max-[760px]:mb-1 max-[760px]:text-[10px]"
        >
          Email address
        </label>
        <input
          autoComplete="email"
          className="h-11 w-full rounded-[10px] border border-[#e1e9e9] bg-white px-3.5 text-[13px] text-[#263538] outline-none transition placeholder:text-[#a0acad] hover:border-[#b8cece] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10 max-[760px]:h-8 max-[760px]:rounded-lg max-[760px]:px-2.5 max-[760px]:text-[10px]"
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label
            htmlFor="password"
            className="text-[12px] font-medium text-[#354346] max-[760px]:text-[10px]"
          >
            Password
          </label>
          <Link
            to="/forgot-password"
            className="text-[11px] font-semibold text-[#078b8d] hover:text-[#066f72] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d] max-[760px]:text-[9px]"
          >
            Forgot password?
          </Link>
        </div>
        <input
          autoComplete="current-password"
          className="h-11 w-full rounded-[10px] border border-[#e1e9e9] bg-white px-3.5 text-[13px] text-[#263538] outline-none transition placeholder:text-[#a0acad] hover:border-[#b8cece] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10 max-[760px]:h-8 max-[760px]:rounded-lg max-[760px]:px-2.5 max-[760px]:text-[10px]"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-[#758184] max-[760px]:gap-1.5 max-[760px]:text-[9px]">
          <input
            className="size-3.5 accent-[#078b8d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d] max-[760px]:size-3"
            name="remember"
            type="checkbox"
          />
          Keep me signed in
        </label>
        <span className="text-[10px] text-[#9ba6a7] max-[760px]:text-[8px]">
          Secure login
        </span>
      </div>

      {loginError && (
        <p className="text-xs text-red-700" role="alert">
          {loginError}
        </p>
      )}

      <button
        className="h-11 w-full rounded-[9px] bg-[#078b8d] text-[13px] font-semibold text-white shadow-[0_4px_10px_rgba(7,139,141,0.2)] transition hover:bg-[#06797b] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d] active:translate-y-px max-[760px]:h-8 max-[760px]:rounded-lg max-[760px]:text-[10px]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
      <circle cx="10" cy="10" r="9" fill="#4285F4" />
      <path
        d="M14.7 10.2c0-.35-.03-.69-.09-1H10v1.9h2.64a2.26 2.26 0 0 1-.98 1.48v1.23h1.59c.93-.86 1.45-2.13 1.45-3.61Z"
        fill="#fff"
      />
      <path
        d="M10 15c1.33 0 2.44-.44 3.25-1.19l-1.59-1.23c-.44.3-1 .49-1.66.49-1.28 0-2.37-.86-2.76-2.02H5.6v1.27A4.9 4.9 0 0 0 10 15Z"
        fill="#fff"
      />
      <path
        d="M7.24 11.05a2.94 2.94 0 0 1 0-1.9V7.88H5.6a4.9 4.9 0 0 0 0 4.44l1.64-1.27Z"
        fill="#fff"
      />
      <path
        d="M10 7.13c.72 0 1.36.25 1.87.74l1.4-1.4A4.68 4.68 0 0 0 10 5a4.9 4.9 0 0 0-4.4 2.88l1.64 1.27c.39-1.16 1.48-2.02 2.76-2.02Z"
        fill="#fff"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
      <rect x="1" y="1" width="8" height="8" fill="#f25022" />
      <rect x="11" y="1" width="8" height="8" fill="#7fba00" />
      <rect x="1" y="11" width="8" height="8" fill="#00a4ef" />
      <rect x="11" y="11" width="8" height="8" fill="#ffb900" />
    </svg>
  );
}

function SocialLoginOptions() {
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-[10px] text-[#9aa5a6] max-[760px]:my-2 max-[760px]:gap-2 max-[760px]:text-[8px]">
        <span className="h-px flex-1 bg-[#e7eded]" />
        Or continue with
        <span className="h-px flex-1 bg-[#e7eded]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AuthProviderButton icon={<GoogleIcon />}>Google</AuthProviderButton>
        <AuthProviderButton icon={<MicrosoftIcon />}>
          Microsoft
        </AuthProviderButton>
      </div>
    </>
  );
}

function LoginFormPanel({
  loginError,
  isSubmitting,
  onSubmit,
}: LoginPageViewProps) {
  return (
    <section className="flex min-w-0 items-center justify-center px-[clamp(24px,6.2vw,86px)] py-[clamp(36px,9vh,76px)] max-[760px]:px-7 max-[760px]:py-3 max-[520px]:px-6 max-[520px]:py-12">
      <div className="w-full max-w-110">
        <LoginHeader />
        <LoginCredentialsForm
          isSubmitting={isSubmitting}
          loginError={loginError}
          onSubmit={onSubmit}
        />
        <SocialLoginOptions />
        <p className="mt-6 text-center text-[10px] leading-[1.6] text-[#9aa5a6] max-[760px]:mt-3 max-[760px]:text-[8px]">
          Protected by industry-standard encryption. We&apos;ll never share your
          information without permission.
        </p>
      </div>
    </section>
  );
}

export default function LoginPageView(props: LoginPageViewProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#eaf6f4] p-2 font-sans text-[#263538] max-[520px]:p-0">
      <div className="grid min-h-[min(760px,calc(100dvh-16px))] w-full max-w-295 grid-cols-[0.94fr_1.06fr] overflow-hidden rounded-[22px] bg-white shadow-[0_18px_60px_rgba(27,75,72,0.12)] max-[520px]:min-h-dvh max-[520px]:grid-cols-1 max-[520px]:rounded-none">
        <LoginHeroPanel />
        <LoginFormPanel {...props} />
      </div>
    </main>
  );
}
