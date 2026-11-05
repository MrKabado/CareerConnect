import type { FormEvent } from "react";
import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import { FORGOT_PASSWORD_FORM_CLASS_NAME, FORGOT_PASSWORD_INPUT_CLASS_NAME } from "@/features/auth/forgot-password/constants";

export function ResetPasswordForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className={FORGOT_PASSWORD_FORM_CLASS_NAME} onSubmit={onSubmit}>
      <div>
        <label
          htmlFor="reset-code"
          className="mb-1.5 block text-[12px] font-medium text-[#354346] max-[760px]:mb-1 max-[760px]:text-[10px]"
        >
          Verification code
        </label>
        <input
          autoComplete="one-time-code"
          className={FORGOT_PASSWORD_INPUT_CLASS_NAME}
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
          htmlFor="reset-password"
          className="mb-1.5 block text-[12px] font-medium text-[#354346] max-[760px]:mb-1 max-[760px]:text-[10px]"
        >
          New password
        </label>
        <input
          autoComplete="new-password"
          className={FORGOT_PASSWORD_INPUT_CLASS_NAME}
          id="reset-password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      <div>
        <label
          htmlFor="reset-password-confirmation"
          className="mb-1.5 block text-[12px] font-medium text-[#354346] max-[760px]:mb-1 max-[760px]:text-[10px]"
        >
          Confirm new password
        </label>
        <input
          autoComplete="new-password"
          className={FORGOT_PASSWORD_INPUT_CLASS_NAME}
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
  );
}
