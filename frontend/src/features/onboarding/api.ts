import { authApi } from "@/features/auth/api";
import { applicantFilesApi, type ApplicantResumeFile } from "@/features/user-profile/backendApi";
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

  uploadResume(
    token: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<ApplicantResumeFile> {
    return applicantFilesApi.uploadOnboardingResume(token, file, onProgress);
  },
};
