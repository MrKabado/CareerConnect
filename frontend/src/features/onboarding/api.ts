import { authApi } from "@/features/auth/api";
import type { OnboardingAnswers } from "@/features/onboarding/store";

export const onboardingApi = {
  register(answers: OnboardingAnswers) {
    return authApi.register({
      name: answers.name.trim(),
      email: answers.email.trim(),
      password: answers.password,
      password_confirmation: answers.passwordConfirmation,
      role: answers.role || "applicant",
    });
  },
};
