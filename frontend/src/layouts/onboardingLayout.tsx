import { Outlet } from "react-router";
import OnboardingNavbar from "@/components/features/onboarding/shared/onboardingNavbar";

export default function OnboardingLayout() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f5faf9] text-[#263538]">
      <OnboardingNavbar />
      <div className="flex flex-1 items-center justify-center px-5 py-9 max-[600px]:px-3 max-[600px]:py-3">
        <Outlet />
      </div>
    </main>
  );
}