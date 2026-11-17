import { BackToProfileLink } from "@/features/auth/verify-email/components/BackToProfileLink";
import { VerifyEmailCard } from "@/features/auth/verify-email/components/VerifyEmailCard";
import { VerifyEmailCodeForm } from "@/features/auth/verify-email/components/VerifyEmailCodeForm";
import { VerifyEmailError } from "@/features/auth/verify-email/components/VerifyEmailError";
import { VerifyEmailHeader } from "@/features/auth/verify-email/components/VerifyEmailHeader";
import { VerifyEmailRequestForm } from "@/features/auth/verify-email/components/VerifyEmailRequestForm";
import { useVerifyEmail } from "@/features/auth/verify-email/hooks/useVerifyEmail";

export default function VerifyEmailPage() {
  const {
    email,
    setEmail,
    codeRequested,
    error,
    isSubmitting,
    requestCode,
    submitCode,
    resetRequestState,
  } = useVerifyEmail();

  return (
    <VerifyEmailCard>
      <VerifyEmailHeader codeRequested={codeRequested} email={email} />

      {!codeRequested ? (
        <VerifyEmailRequestForm
          email={email}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onSubmit={requestCode}
        />
      ) : (
        <VerifyEmailCodeForm
          isSubmitting={isSubmitting}
          onSubmit={submitCode}
          onUseDifferentEmail={resetRequestState}
        />
      )}

      <VerifyEmailError error={error} />
      <BackToProfileLink />
    </VerifyEmailCard>
  );
}
