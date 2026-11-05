import { FORGOT_PASSWORD_MESSAGES } from "./constants";
import type { ForgotPasswordValues } from "./types";

export function validateForgotPasswordEmail(email: string): string | null {
  if (email.trim().length === 0) {
    return "Please enter your email address.";
  }

  return null;
}

export function validateForgotPasswordReset(values: ForgotPasswordValues): string | null {
  if (values.password !== values.passwordConfirmation) {
    return FORGOT_PASSWORD_MESSAGES.passwordMismatch;
  }

  return null;
}
