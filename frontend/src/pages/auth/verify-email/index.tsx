import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/useAuth";

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    () => new URLSearchParams(location.search).get("email") ?? "",
  );
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.requestEmailVerificationCode(email.trim());
      setCodeRequested(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request a verification code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setIsSubmitting(true);

    try {
      await verifyEmail(email.trim(), String(formData.get("code") ?? ""));
      navigate("/profile", { replace: true });
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Unable to verify your email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#eaf6f4] px-5 py-10 font-sans text-[#263538]">
      <section className="w-full max-w-[440px] rounded-2xl bg-white p-8 shadow-[0_16px_50px_rgba(27,75,72,0.08)] max-[520px]:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">
          CareerConnect
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.6px]">
          Verify your email
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#718082]">
          {codeRequested
            ? `Enter the six-digit verification code sent to ${email}.`
            : "We’ll send a six-digit code to confirm your email address."}
        </p>

        {!codeRequested ? (
          <form className="mt-6 space-y-4" onSubmit={requestCode}>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold"
                htmlFor="verification-email"
              >
                Email address
              </label>
              <input
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3 text-sm outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
                id="verification-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <OnboardingButton className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send verification code"}
            </OnboardingButton>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submitCode}>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold"
                htmlFor="verification-code"
              >
                Verification code
              </label>
              <input
                autoComplete="one-time-code"
                className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3 text-sm tracking-[0.2em] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
                id="verification-code"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                name="code"
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />
            </div>
            <OnboardingButton className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Verify email"}
            </OnboardingButton>
            <button
              className="w-full text-center text-xs font-semibold text-[#078b8d] hover:underline"
              disabled={isSubmitting}
              onClick={() => {
                setCodeRequested(false);
                setError(null);
              }}
              type="button"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <p className="mt-6 text-center text-sm text-[#718082]">
          <Link className="font-semibold text-[#078b8d] hover:underline" to="/profile">
            Back to profile
          </Link>
        </p>
      </section>
    </main>
  );
}