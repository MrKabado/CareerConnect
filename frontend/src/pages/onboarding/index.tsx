import { type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useOnboarding } from "@/features/onboarding/useOnboarding";
import OnboardingPageView from "@/features/onboarding/components/OnboardingPageView";

export default function OnboardingPage() {
  const onboarding = useOnboarding();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onboarding.next();
  }

  function handleSkipResume() {
    onboarding.setAnswer("resumeSkipped", true);
    onboarding.setAnswer("resumeFile", null);
    void onboarding.skip();
  }

  function handleSeeRecommendations() {
    navigate("/recommendations", { replace: true });
  }

  return (
    <OnboardingPageView
      onboarding={onboarding}
      onSeeRecommendations={handleSeeRecommendations}
      onSkipResume={handleSkipResume}
      onSubmit={handleSubmit}
    />
  );
}
