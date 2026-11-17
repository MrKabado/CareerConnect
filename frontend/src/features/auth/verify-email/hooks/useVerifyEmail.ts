import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/useAuth";
import { validateVerifyEmailAddress, validateVerifyEmailCode } from "@/features/auth/verify-email/validation";

export function useVerifyEmail() {
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

    const emailValidationError = validateVerifyEmailAddress(email);
    if (emailValidationError) {
      setError(emailValidationError);
      return;
    }

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
    const code = String(formData.get("code") ?? "");

    const codeValidationError = validateVerifyEmailCode(code);
    if (codeValidationError) {
      setError(codeValidationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await verifyEmail(email.trim(), code);
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

  function resetRequestState() {
    setCodeRequested(false);
    setError(null);
  }

  return {
    email,
    setEmail,
    codeRequested,
    setCodeRequested,
    error,
    isSubmitting,
    requestCode,
    submitCode,
    resetRequestState,
  };
}
