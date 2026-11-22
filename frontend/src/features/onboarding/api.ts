import { authApi } from "@/features/auth/api";
import { applicantFilesApi, type ApplicantResumeFile } from "@/features/user-profile/backendApi";
import type { OnboardingAnswers } from "@/features/onboarding/store";
import { apiRequest } from "@/lib/axios";

type OnboardingProfileResponse = {
  message: string;
  data: unknown;
};

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

  saveApplicantProfile(token: string, answers: OnboardingAnswers) {
    return apiRequest<OnboardingProfileResponse>(
      "/onboarding/profile",
      {
        method: "PUT",
        data: {
          goal: answers.goal,
          ...(answers.goal === "job-seeker"
            ? {
                job_categories: answers.jobCategories,
                desired_titles: answers.desiredJobTitles,
                experience_level: answers.experienceLevel || null,
                employment_types: answers.employmentTypes,
                minimum_salary: answers.minimumSalary || null,
                maximum_salary: answers.maximumSalary || null,
              }
            : {
                training_fields: answers.trainingFields,
                school: answers.school,
                course: answers.course,
                year_level: answers.yearLevel,
                required_ojt_hours: answers.requiredOjtHours,
                requires_moa: answers.requiresMoa,
                preferred_start_date: answers.preferredStartDate,
                allowance_preference: answers.allowancePreference,
              }),
          skills: answers.skills,
          work_setup: answers.workSetup,
          preferred_locations: answers.preferredLocations,
        },
      },
      token,
    );
  },

  completeApplicantProfile(token: string) {
    return apiRequest<OnboardingProfileResponse>(
      "/onboarding/complete",
      { method: "POST" },
      token,
    );
  },

  uploadResume(
    token: string,
    file: File,
    onProgress: (progress: number) => void,
    isAuthenticated: boolean,
  ): Promise<ApplicantResumeFile> {
    return isAuthenticated
      ? applicantFilesApi.uploadResume(token, file, onProgress)
      : applicantFilesApi.uploadOnboardingResume(token, file, onProgress);
  },
};
