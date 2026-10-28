import "@/styles/global.css";

import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import GuestLayout from "@/layouts/guestLayout";
import OnboardingLayout from "@/layouts/onboardingLayout";
import HomePage from "@/pages/(guest)/home/index";
import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import OnboardingPage from "@/pages/onboarding";
import JobSearchPage from "@/pages/user/job-search";
import OjtSearchPage from "@/pages/user/ojt-search";
import RecommendationsPage from "@/pages/user/recommendations";
import ApplicationsPage from "@/pages/user/applications";
import ProfilePage from "@/pages/user/profile";
import CompanyProfilePage from "@/pages/user/company-profile";
import JobApplicationPage from "@/pages/user/apply";
import { AuthProvider } from "@/features/auth/AuthProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route element={<GuestLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="/job-search" element={<JobSearchPage />} />
        <Route path="/ojt-search" element={<OjtSearchPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/company/:companyName" element={<CompanyProfilePage />} />
        <Route path="/apply/:jobId" element={<JobApplicationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<OnboardingLayout />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
