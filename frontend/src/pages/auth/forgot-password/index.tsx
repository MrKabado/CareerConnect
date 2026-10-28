import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { authApi } from "@/features/auth/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.requestPasswordReset(email.trim());
      setCodeRequested(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request a password reset code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(
      formData.get("password_confirmation") ?? "",
    );

    if (password !== passwordConfirmation) {
      setError("Your passwords do not match.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await authApi.resetPassword({
        email: email.trim(),
        code: String(formData.get("code") ?? ""),
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate("/login", {
        replace: true,
        state: { message: response.message },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset your password.",
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
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#718082]">
          {codeRequested
            ? `Enter the verification code sent to ${email}, then choose a new password.`
            : "Enter your account email and we’ll send a password reset code if it’s eligible."}
        </p>

        {!codeRequested ? (
          <form className="mt-6 space-y-4" onSubmit={handleRequestCode}>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold"
                htmlFor="reset-email"
              >
                Email address
              </label>
              <input
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3 text-sm outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
                id="reset-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <OnboardingButton className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset code"}
            </OnboardingButton>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold"
                htmlFor="reset-code"
              >
                Verification code
              </label>
              <input
                autoComplete="one-time-code"
                className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3 text-sm outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
                id="reset-code"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                name="code"
                pattern="[0-9]{6}"
                placeholder="6-digit code"
                required
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold"
                htmlFor="reset-password"
              >
                New password
              </label>
              <input
                autoComplete="new-password"
                className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3 text-sm outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
                id="reset-password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold"
                htmlFor="reset-password-confirmation"
              >
                Confirm new password
              </label>
              <input
                autoComplete="new-password"
                className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3 text-sm outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
                id="reset-password-confirmation"
                minLength={8}
                name="password_confirmation"
                required
                type="password"
              />
            </div>
            <OnboardingButton className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting…" : "Reset password"}
            </OnboardingButton>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <p className="mt-6 text-center text-sm text-[#718082]">
          Remembered it?{" "}
          <Link className="font-semibold text-[#078b8d] hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
