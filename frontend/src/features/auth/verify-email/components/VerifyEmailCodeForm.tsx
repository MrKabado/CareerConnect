import type { FormEvent } from "react";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { VERIFY_EMAIL_CODE_INPUT_CLASS_NAME, VERIFY_EMAIL_LABELS } from "@/features/auth/verify-email/constants";

export function VerifyEmailCodeForm({
  isSubmitting,
  onSubmit,
  onUseDifferentEmail,
}: {
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseDifferentEmail: () => void;
}) {
  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <label
          className="mb-1.5 block text-xs font-semibold"
          htmlFor="verification-code"
        >
          {VERIFY_EMAIL_LABELS.code}
        </label>
        <input
          autoComplete="one-time-code"
          className={VERIFY_EMAIL_CODE_INPUT_CLASS_NAME}
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
        onClick={onUseDifferentEmail}
        type="button"
      >
        Use a different email
      </button>
    </form>
  );
}
