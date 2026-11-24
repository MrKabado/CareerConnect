import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { authApi } from "@/features/auth/api";
import { FORGOT_PASSWORD_MESSAGES } from "@/features/auth/forgot-password/constants";
import { validateForgotPasswordEmail, validateForgotPasswordReset } from "@/features/auth/forgot-password/validation";

export function useForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const emailValidationError = validateForgotPasswordEmail(email);

    if (emailValidationError) {
      setError(emailValidationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.requestPasswordReset(email.trim());
      setCodeRequested(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : FORGOT_PASSWORD_MESSAGES.requestCodeFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      email: email.trim(),
      code: String(formData.get("code") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("password_confirmation") ?? ""),
    };

    const passwordValidationError = validateForgotPasswordReset(values);

    if (passwordValidationError) {
      setError(passwordValidationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await authApi.resetPassword({
        email: values.email,
        code: values.code,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      });

      navigate("/login", {
        replace: true,
        state: { message: response.message },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : FORGOT_PASSWORD_MESSAGES.resetFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    email,
    setEmail,
    codeRequested,
    error,
    isSubmitting,
    handleRequestCode,
    handleResetPassword,
  };
}
