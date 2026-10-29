import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { employerRegistrationApi } from "@/features/employer-registration/api";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";

export default function EmployerEmailVerification() {
  const navigate = useNavigate();
  const { employer } = useEmployerStatus();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  async function resendCode() {
    setError(null);
    setNotice(null);
    setIsSending(true);
    try {
      const response = await employerRegistrationApi.requestEmailVerificationCode();
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a verification code.");
    } finally {
      setIsSending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsVerifying(true);
    try {
      await employerRegistrationApi.verifyEmailCode(code);
      navigate("/employer/verification", { replace: true });
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify your email.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#eaf6f4] px-5 py-10 font-sans text-[#263538]">
      <section className="w-full max-w-[440px] rounded-2xl bg-white p-8 shadow-[0_16px_50px_rgba(27,75,72,0.08)] max-[520px]:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">CareerConnect for employers</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.6px]">Verify your work email</h1>
        <p className="mt-2 text-sm leading-6 text-[#718082]">
          Confirm {employer?.workEmail ?? "your work email"} to continue setting up your employer account.
        </p>

        <div className="mt-5 rounded-lg border border-[#dcece8] bg-[#f2f9f7] px-3 py-2.5 text-[10px] leading-5 text-[#587675]">
          Development code: <strong className="font-bold">123456</strong>. Real email delivery is a TODO for backend integration.
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="employer-verification-code">6-digit verification code</label>
            <input
              autoComplete="one-time-code"
              className="h-12 w-full rounded-lg border border-[#dfe8e8] px-3 text-center text-lg tracking-[0.35em] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
              id="employer-verification-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              value={code}
            />
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          {notice && <p className="text-[10px] text-[#287a45]" role="status">{notice}</p>}
          <OnboardingButton className="w-full" disabled={isVerifying || code.length !== 6}>
            {isVerifying ? "Verifying…" : "Verify email"}
          </OnboardingButton>
        </form>

        <button
          className="mt-4 w-full text-center text-[10px] font-semibold text-[#078b8d] hover:underline disabled:opacity-60"
          disabled={isSending}
          onClick={() => void resendCode()}
          type="button"
        >
          {isSending ? "Sending…" : "Resend code"}
        </button>
        <p className="mt-5 text-center text-xs text-[#718082]">
          <Link className="font-semibold text-[#078b8d] hover:underline" to="/employer/register">Back to registration</Link>
        </p>
      </section>
    </main>
  );
}