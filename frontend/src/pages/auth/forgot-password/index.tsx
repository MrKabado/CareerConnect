import { BackToSignInLink } from "@/features/auth/forgot-password/components/BackToSignInLink";
import { ForgotPasswordFormError } from "@/features/auth/forgot-password/components/ForgotPasswordFormError";
import { ForgotPasswordHeader } from "@/features/auth/forgot-password/components/ForgotPasswordHeader";
import { ForgotPasswordLayout } from "@/features/auth/forgot-password/components/ForgotPasswordLayout";
import { RequestResetForm } from "@/features/auth/forgot-password/components/RequestResetForm";
import { ResetPasswordForm } from "@/features/auth/forgot-password/components/ResetPasswordForm";
import { useForgotPassword } from "@/features/auth/forgot-password/hooks/useForgotPassword";

export default function ForgotPasswordPage() {
  const {
    email,
    setEmail,
    codeRequested,
    error,
    isSubmitting,
    handleRequestCode,
    handleResetPassword,
  } = useForgotPassword();

  return (
    <ForgotPasswordLayout>
      <ForgotPasswordHeader codeRequested={codeRequested} email={email} />

      {!codeRequested ? (
        <RequestResetForm
          email={email}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onSubmit={handleRequestCode}
        />
      ) : (
        <ResetPasswordForm isSubmitting={isSubmitting} onSubmit={handleResetPassword} />
      )}

      <ForgotPasswordFormError error={error} />
      <BackToSignInLink />
    </ForgotPasswordLayout>
  );
}
