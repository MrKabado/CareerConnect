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
  if (
    values.password.length < 12 ||
    !/[a-z]/.test(values.password) ||
    !/[A-Z]/.test(values.password) ||
    !/\d/.test(values.password) ||
    !/[^A-Za-z0-9]/.test(values.password)
  ) {
    return "Use at least 12 characters with uppercase, lowercase, numbers, and symbols.";
  }

  return null;
}
