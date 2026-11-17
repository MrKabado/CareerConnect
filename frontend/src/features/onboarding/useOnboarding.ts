import { useCallback, useSyncExternalStore } from "react";
import {
  getOnboardingSteps,
  getStepIndex,
  onboardingTotalSteps,
} from "@/features/onboarding/config/steps";
import { onboardingApi } from "@/features/onboarding/api";
import { validateOnboardingStep } from "@/features/onboarding/schemas";
import { onboardingStore } from "@/features/onboarding/store";

export function useOnboarding() {
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
    if (state.currentStep === "create-account" && state.accountCreated) {
      const nextStep = steps[currentIndex + 1];
      if (nextStep) onboardingStore.setStep(nextStep.id);
      return;
    }

    const errors = validateOnboardingStep(state.currentStep, state.answers);
    onboardingStore.setErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (state.currentStep === "create-account") {
      onboardingStore.setSubmitting(true);

      try {
        await onboardingApi.register(state.answers);
        onboardingStore.markAccountCreated();
        const nextStep = steps[currentIndex + 1];
        if (nextStep) onboardingStore.setStep(nextStep.id);
      } catch (error) {
        onboardingStore.setSubmitError(
          error instanceof Error ? error.message : "Unable to create your account.",
        );
      }

      return;
    }

    if (isLastStep) {
      await finish();
      return;
    }

    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      onboardingStore.setStep(nextStep.id);
    }
  }, [
    currentIndex,
    finish,
    isLastStep,
    steps,
    state.accountCreated,
    state.answers,
    state.currentStep,
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
    onboardingStore.setSubmitError(
      "Your progress is held only in this browser session and cannot be saved to your account yet.",
    );
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
