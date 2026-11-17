import type { FormEvent } from "react";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { FORGOT_PASSWORD_FORM_CLASS_NAME, FORGOT_PASSWORD_INPUT_CLASS_NAME } from "@/features/auth/forgot-password/constants";

export function RequestResetForm({
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
    <form className={FORGOT_PASSWORD_FORM_CLASS_NAME} onSubmit={onSubmit}>
      <div>
        <label
          htmlFor="reset-email"
          className="mb-1.5 block text-[12px] font-medium text-[#354346] max-[760px]:mb-1 max-[760px]:text-[10px]"
        >
          Email address
        </label>
        <input
          autoComplete="email"
          className={FORGOT_PASSWORD_INPUT_CLASS_NAME}
          id="reset-email"
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </div>

      <OnboardingButton className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send reset code"}
      </OnboardingButton>
    </form>
  );
}
