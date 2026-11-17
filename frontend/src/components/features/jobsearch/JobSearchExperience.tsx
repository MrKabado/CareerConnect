import { useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import Hero from "@/components/common/user/userHero";
import MainBody from "@/components/common/user/userMainbody";
import { onboardingStore } from "@/features/onboarding/store";

type SearchAudience = "job-seeker" | "ojt-seeker";

export default function JobSearchExperience({
  audience,
}: {
  audience: SearchAudience;
}) {
  const [search, setSearch] = useState("");
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const navigate = useNavigate();
  const profileTags =
    audience === "ojt-seeker"
      ? [
          ...onboarding.answers.trainingFields,
          onboarding.answers.requiredOjtHours
            ? `${onboarding.answers.requiredOjtHours} hours`
            : "",
          onboarding.answers.requiresMoa ? "MOA required" : "",
          ...onboarding.answers.preferredLocations,
        ].filter(Boolean)
      : [
          ...onboarding.answers.jobCategories,
          onboarding.answers.workSetup,
          ...onboarding.answers.preferredLocations,
        ].filter(Boolean);

  function changeAudience(nextAudience: SearchAudience) {
    navigate(
      nextAudience === "ojt-seeker"
        ? "/ojt-search"
        : "/job-search",
    );
  }

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />

      <main className="flex-1">
        <Hero
          audience={audience}
          onAudienceChange={changeAudience}
          onSearchChange={setSearch}
          profileTags={profileTags}
          search={search}
        />
        <MainBody
          audience={audience}
          key={audience}
          onSearchChange={setSearch}
          search={search}
        />
      </main>

      <Footer />
    </div>
  );
}
