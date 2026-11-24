export const FORGOT_PASSWORD_OFFICE_PHOTO =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85";

export const FORGOT_PASSWORD_EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FORGOT_PASSWORD_STEPS = {
  REQUEST: "request",
  RESET: "reset",
} as const;

export const FORGOT_PASSWORD_MESSAGES = {
  requestCodeFailed: "Unable to request a password reset code.",
  resetFailed: "Unable to reset your password.",
  passwordMismatch: "Your passwords do not match.",
} as const;

export const FORGOT_PASSWORD_LABELS = {
  email: "Email address",
  code: "Verification code",
  password: "New password",
  passwordConfirmation: "Confirm new password",
  sendResetCode: "Send reset code",
  sending: "Sending…",
  resetting: "Resetting…",
  resetPassword: "Reset password",
} as const;

export const FORGOT_PASSWORD_INPUT_CLASS_NAME =
  "h-11 w-full rounded-[10px] border border-[#e1e9e9] bg-white px-3.5 text-[13px] text-[#263538] outline-none transition placeholder:text-[#a0acad] hover:border-[#b8cece] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10 max-[760px]:h-8 max-[760px]:rounded-lg max-[760px]:px-2.5 max-[760px]:text-[10px]";

export const FORGOT_PASSWORD_FORM_CLASS_NAME =
  "space-y-4.25 max-[760px]:space-y-2";

export const FORGOT_PASSWORD_HEADER_CLASS_NAME =
  "mb-7 max-[760px]:mb-3";
