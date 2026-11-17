export function validateVerifyEmailAddress(email: string): string | null {
  if (email.trim().length === 0) {
    return "Please enter your email address.";
  }

  return null;
}

export function validateVerifyEmailCode(code: string): string | null {
  if (code.trim().length === 0) {
    return "Please enter a verification code.";
  }

  return null;
}
