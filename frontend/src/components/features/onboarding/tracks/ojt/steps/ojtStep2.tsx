import type { OnboardingAnswers } from "@/features/onboarding/store";
import type { OnboardingErrors } from "@/features/onboarding/schemas";

type OjtStep2Props = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  disabled?: boolean;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

const inputClassName =
  "h-[42px] w-full rounded-[9px] border border-[#dfe8e8] bg-white px-3 text-xs text-[#354346] outline-none transition placeholder:text-[#a0acad] hover:border-[#c5d6d6] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10 max-[600px]:h-8 max-[600px]:rounded-lg max-[600px]:text-[10px]";

export default function OjtStep2({
  answers,
  errors,
  disabled = false,
  onChange,
}: OjtStep2Props) {
  return (
    <div className="space-y-4 max-[600px]:space-y-2">
      <div>
        <label
          className="mb-1.5 block text-[11px] font-semibold text-[#354346] max-[600px]:mb-1 max-[600px]:text-[10px]"
          htmlFor="onboarding-name"
        >
          Full name <span className="text-[#d34c4c]">*</span>
        </label>
        <input
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "onboarding-name-error" : undefined}
          autoComplete="name"
          className={inputClassName}
          disabled={disabled}
          id="onboarding-name"
          maxLength={255}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="e.g. Jamie Dela Cruz"
          value={answers.name}
        />
        {errors.name && (
          <p
            className="mt-1 text-[11px] text-red-700"
            id="onboarding-name-error"
            role="alert"
          >
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          className="mb-1.5 block text-[11px] font-semibold text-[#354346] max-[600px]:mb-1 max-[600px]:text-[10px]"
          htmlFor="onboarding-email"
        >
          Email address <span className="text-[#d34c4c]">*</span>
        </label>
        <input
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "onboarding-email-error" : undefined}
          autoComplete="email"
          className={inputClassName}
          disabled={disabled}
          id="onboarding-email"
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={answers.email}
        />
        {errors.email && (
          <p
            className="mt-1 text-[11px] text-red-700"
            id="onboarding-email-error"
            role="alert"
          >
            {errors.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              className="text-[11px] font-semibold text-[#354346] max-[600px]:text-[10px]"
              htmlFor="onboarding-password"
            >
              Password <span className="text-[#d34c4c]">*</span>
            </label>
            <span className="text-[9px] text-[#8a9899] max-[600px]:text-[8px]">At least 8 characters</span>
          </div>
          <input
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "onboarding-password-error" : undefined
            }
            autoComplete="new-password"
            className={inputClassName}
            disabled={disabled}
            id="onboarding-password"
            onChange={(event) => onChange("password", event.target.value)}
            placeholder="Create a password"
            type="password"
            value={answers.password}
          />
          {errors.password && (
            <p
              className="mt-1 text-[11px] text-red-700"
              id="onboarding-password-error"
              role="alert"
            >
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-1.5 block text-[11px] font-semibold text-[#354346] max-[600px]:mb-1 max-[600px]:text-[10px]"
            htmlFor="onboarding-password-confirmation"
          >
            Confirm password <span className="text-[#d34c4c]">*</span>
          </label>
          <input
            aria-invalid={Boolean(errors.passwordConfirmation)}
            aria-describedby={
              errors.passwordConfirmation
                ? "onboarding-password-confirmation-error"
                : undefined
            }
            autoComplete="new-password"
            className={inputClassName}
            disabled={disabled}
            id="onboarding-password-confirmation"
            onChange={(event) =>
              onChange("passwordConfirmation", event.target.value)
            }
            placeholder="Enter it again"
            type="password"
            value={answers.passwordConfirmation}
          />
          {errors.passwordConfirmation && (
            <p
              className="mt-1 text-[11px] text-red-700"
              id="onboarding-password-confirmation-error"
              role="alert"
            >
              {errors.passwordConfirmation}
            </p>
          )}
        </div>
      </div>

      <div>
        <label         className="inline-flex cursor-pointer items-start gap-2 text-[10px] leading-5 text-[#758184] max-[600px]:gap-1.5 max-[600px]:text-[9px] max-[600px]:leading-4">
          <input
            aria-invalid={Boolean(errors.acceptedTerms)}
            className="mt-1 size-3.5 shrink-0 accent-[#078b8d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d]"
            checked={answers.acceptedTerms}
            disabled={disabled}
            onChange={(event) =>
              onChange("acceptedTerms", event.target.checked)
            }
            type="checkbox"
          />
          <span>
            I agree to the{" "}
            <span className="font-medium text-[#078b8d]">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="font-medium text-[#078b8d]">Privacy Policy</span>.
          </span>
        </label>
        {errors.acceptedTerms && (
          <p className="mt-1 text-[11px] text-red-700" role="alert">
            {errors.acceptedTerms}
          </p>
        )}
      </div>
      {disabled && (
        <p className="text-xs leading-5 text-[#718082]">
          Your account has already been created. Account details can’t be
          changed in this onboarding session.
        </p>
      )}
    </div>
  );
}