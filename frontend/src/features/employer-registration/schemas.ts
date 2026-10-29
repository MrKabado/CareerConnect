import type { EmployerRegistrationInput } from "@/features/employer-registration/types";

export type EmployerRegistrationErrors = Partial<
  Record<keyof EmployerRegistrationInput, string>
>;

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
  if (input.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  if (!input.companyName.trim()) errors.companyName = "Enter your company name.";
  if (input.website.trim()) {
    try {
      const website = new URL(input.website);
      if (!website.protocol.startsWith("http")) {
        errors.website = "Enter a valid company website URL.";
      }
    } catch {
      errors.website = "Enter a valid company website URL.";
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