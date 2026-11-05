import type { FormEvent } from "react";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { VERIFY_EMAIL_INPUT_CLASS_NAME, VERIFY_EMAIL_LABELS } from "@/features/auth/verify-email/constants";

export function VerifyEmailRequestForm({
  email,
  isSubmitting,
  onEmailChange,
  onSubmit,
}: {
  email: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <label
          className="mb-1.5 block text-xs font-semibold"
          htmlFor="verification-email"
        >
          {VERIFY_EMAIL_LABELS.email}
        </label>
        <input
          autoComplete="email"
          className={VERIFY_EMAIL_INPUT_CLASS_NAME}
          id="verification-email"
          onChange={(event) => onEmailChange(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <OnboardingButton className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send verification code"}
      </OnboardingButton>
    </form>
  );
}
