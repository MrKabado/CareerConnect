export type VerifyEmailValues = {
  email: string;
  code: string;
};

export type VerifyEmailFormState = {
  email: string;
  codeRequested: boolean;
  error: string | null;
  isSubmitting: boolean;
};
