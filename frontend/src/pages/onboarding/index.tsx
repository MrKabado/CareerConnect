import { type FormEvent, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { useOnboarding } from "@/features/onboarding/useOnboarding";
import OnboardingPageView from "@/features/onboarding/components/OnboardingPageView";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const handleResumeVerification = useCallback(
    (email: string) => {
      navigate(
        `/verify-email?email=${encodeURIComponent(email)}&codeSent=1`,
        { replace: true },
      );
    },
    [navigate],
  );
  const onboarding = useOnboarding(
    handleResumeVerification,
    user?.role === "applicant" ? token : null,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onboarding.next();
  }

  function handleSkipResume() {
    onboarding.setAnswer("resumeSkipped", true);
    onboarding.setAnswer("resumeFile", null);
    void onboarding.skip();
  }

  function handleVerifyEmail() {
    navigate(
      `/verify-email?email=${encodeURIComponent(onboarding.answers.email.trim())}&codeSent=1`,
      { replace: true },
    );
  }

  function handleSaveLater() {
    if (onboarding.saveForLater()) {
      navigate("/", { replace: true });
    }
  }

  return (
    <OnboardingPageView
      onboarding={onboarding}
      onVerifyEmail={handleVerifyEmail}
      onSaveLater={handleSaveLater}
      onSkipResume={handleSkipResume}
      onSubmit={handleSubmit}
    />
  );
}
