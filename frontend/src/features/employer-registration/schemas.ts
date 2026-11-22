import type { EmployerRegistrationInput } from "@/features/employer-registration/types";

export type EmployerRegistrationErrors = Partial<
  Record<keyof EmployerRegistrationInput, string>
>;


export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateEmployerRegistration(
  input: EmployerRegistrationInput,
): EmployerRegistrationErrors {
  const errors: EmployerRegistrationErrors = {};

  if (!input.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!input.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!input.workEmail.trim()) {
    errors.workEmail = "Enter your work email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.workEmail.trim())) {
    errors.workEmail = "Enter a valid work email.";
  }
  if (
    input.password.length < 12 ||
    !/[a-z]/.test(input.password) ||
    !/[A-Z]/.test(input.password) ||
    !/\d/.test(input.password) ||
    !/[^A-Za-z0-9]/.test(input.password)
  ) {
    errors.password =
      "Use at least 12 characters with uppercase, lowercase, numbers, and symbols.";
  }
  if (!input.passwordConfirmation) {
    errors.passwordConfirmation = "Confirm your password.";
  } else if (input.password !== input.passwordConfirmation) {
    errors.passwordConfirmation = "Passwords do not match.";
  }
  if (!input.companyName.trim()) errors.companyName = "Enter your company name.";
  if (input.website.trim()) {
    try {
      const website = new URL(normalizeWebsite(input.website));
      if (
        !["http:", "https:"].includes(website.protocol) ||
        !website.hostname.includes(".") ||
        website.username ||
        website.password
      ) {
        errors.website = "Enter a valid company website, such as company.com or https://company.vercel.app.";
      }
    } catch {
      errors.website = "Enter a valid company website, such as company.com or https://company.vercel.app.";
    }
  }
  if (!input.companySize) errors.companySize = "Select your company size.";
  if (!input.industry) errors.industry = "Select your industry.";
  if (!input.companyRole.trim()) {
    errors.companyRole = "Enter your role at the company.";
  }
  if (!input.termsAccepted) {
    errors.termsAccepted = "Accept the terms to create an employer account.";
  }

  return errors;
}