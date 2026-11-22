import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getOnboardingSteps,
  getStepIndex,
  onboardingTotalSteps,
} from "@/features/onboarding/config/steps";
import { onboardingApi } from "@/features/onboarding/api";
import { validateOnboardingStep } from "@/features/onboarding/schemas";
import { onboardingStore } from "@/features/onboarding/store";
import { applicantFilesApi } from "@/features/user-profile/backendApi";

export function useOnboarding(
  onResumeVerification: (email: string) => void,
  authenticatedApplicantToken: string | null = null,
) {
  const [isResumeAlreadyUploaded, setIsResumeAlreadyUploaded] =
    useState(false);
  const [existingResumeName, setExistingResumeName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!authenticatedApplicantToken) return;
    let active = true;
    applicantFilesApi
      .resume(authenticatedApplicantToken)
      .then((resume) => {
        if (!active) return;
        setIsResumeAlreadyUploaded(resume !== null);
        setExistingResumeName(resume?.original_filename ?? null);
        if (resume) {
          onboardingStore.markResumeUploaded(resume.original_filename);
        }
      })
      .catch(() => {
        if (active) {
          setIsResumeAlreadyUploaded(false);
          setExistingResumeName(null);
        }
      });
    return () => {
      active = false;
    };
  }, [authenticatedApplicantToken]);

  const state = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const steps = getOnboardingSteps(state.answers.goal);
  const currentIndex = getStepIndex(state.currentStep, state.answers.goal);
  const isLastStep = currentIndex + 1 === steps.length;

  const finish = useCallback(async () => {
    onboardingStore.complete(
      state.answers.goal === "job-seeker"
        ? "Your job profile setup is complete."
        : "Your account has been created. Verify your email to activate it. Your OJT profile answers are ready, but profile saving is not available yet.",
    );
  }, [state.answers.goal]);

  const next = useCallback(async () => {
    const currentState = onboardingStore.getSnapshot();
    if (currentState.isSubmitting) return;
    const currentSteps = getOnboardingSteps(currentState.answers.goal);
    const currentStepIndex = getStepIndex(
      currentState.currentStep,
      currentState.answers.goal,
    );
    const isCurrentLastStep = currentStepIndex + 1 === currentSteps.length;

    if (
      currentState.currentStep === "create-account" &&
      currentState.accountCreated
    ) {
      const nextStep = currentSteps[currentStepIndex + 1];
      if (nextStep) onboardingStore.setStep(nextStep.id);
      return;
    }

    const errors = validateOnboardingStep(
      currentState.currentStep,
      currentState.answers,
    );
    onboardingStore.setErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (
      currentState.currentStep === "resume" &&
      currentState.answers.resumeFile &&
      !onboardingStore.isResumeUploaded(currentState.answers.resumeFile) &&
      !isResumeAlreadyUploaded
    ) {
      const uploadToken =
        authenticatedApplicantToken ?? currentState.onboardingToken;
      const isAuthenticatedUpload = authenticatedApplicantToken !== null;
      if (!uploadToken) {
        onboardingStore.setSubmitError(
          "This saved draft has no upload session. Sign in to upload your resume, or skip this optional step and add it from your profile later.",
        );
        return;
      }

      onboardingStore.setSubmitting(true);
      onboardingStore.setUploadProgress(0);
      try {
        const uploaded = await onboardingApi.uploadResume(
          uploadToken,
          currentState.answers.resumeFile,
          onboardingStore.setUploadProgress,
          isAuthenticatedUpload,
        );
        onboardingStore.markResumeUploaded(uploaded.original_filename);
      } catch (error) {
        onboardingStore.setSubmitError(
          error instanceof Error ? error.message : "Unable to upload your resume.",
        );
        return;
      } finally {
        onboardingStore.setSubmitting(false);
        onboardingStore.setUploadProgress(null);
      }
    }

    if (currentState.currentStep === "create-account") {
      onboardingStore.setSubmitting(true);

      try {
        const registration = await onboardingApi.register(currentState.answers);

        if (registration.resume_verification) {
          onboardingStore.setSubmitting(false);
          onResumeVerification(currentState.answers.email.trim());
          return;
        }

        onboardingStore.markAccountCreated();
        const nextStep = currentSteps[currentStepIndex + 1];
        if (nextStep) onboardingStore.setStep(nextStep.id);
        if (registration.onboarding_token) {
          onboardingStore.setOnboardingToken(registration.onboarding_token);
        }
      } catch (error) {
        onboardingStore.setSubmitError(
          error instanceof Error ? error.message : "Unable to create your account.",
        );
      }

      return;
    }

    if (isCurrentLastStep) {
      await finish();
      return;
    }

    const nextStep = currentSteps[currentStepIndex + 1];
    if (nextStep) {
      onboardingStore.setStep(nextStep.id);
    }
  }, [
    authenticatedApplicantToken,
    finish,
    isResumeAlreadyUploaded,
    onResumeVerification,
  ]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      onboardingStore.setStep(steps[currentIndex - 1].id);
    }
  }, [currentIndex, steps]);

  const skip = useCallback(async () => {
    if (isLastStep) {
      await finish();
      return;
    }

    onboardingStore.setStep(steps[currentIndex + 1].id);
  }, [currentIndex, finish, isLastStep, steps]);

  const saveForLater = useCallback(() => {
    return onboardingStore.saveDraft();
  }, []);

  const setAnswer = onboardingStore.setAnswer;
  const toggleListAnswer = onboardingStore.toggleListAnswer;

  return {
    ...state,
    currentIndex,
    isFirstStep: currentIndex === 0,
    isLastStep,
    totalSteps: onboardingTotalSteps,
    steps,
    isResumeUploaded: onboardingStore.isResumeUploaded(state.answers.resumeFile),
    isResumeAlreadyUploaded,
    existingResumeName,
    next,
    back,
    skip,
    saveForLater,
    finish,
    setAnswer,
    toggleListAnswer,
    setStep: onboardingStore.setStep,
    reset: onboardingStore.reset,
  };
}
