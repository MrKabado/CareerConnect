export type ForgotPasswordStep = "request" | "reset";

export type ForgotPasswordValues = {
  email: string;
  code: string;
  password: string;
  passwordConfirmation: string;
};

export type ForgotPasswordValidationErrors = Partial<{
  email: string;
  code: string;
  password: string;
  passwordConfirmation: string;
  submit: string;
}>;
