import "@/styles/global.css";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { PageSkeleton } from "@/components/ui/skeleton";
import GuestLayout from "@/layouts/guestLayout";
import OnboardingLayout from "@/layouts/onboardingLayout";
import HomePage from "@/pages/(guest)/home/index";
import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import VerifyEmailPage from "@/pages/auth/verify-email";
import OnboardingPage from "@/pages/onboarding";
import JobSearchPage from "@/pages/user/job-search";
import OjtSearchPage from "@/pages/user/ojt-search";
import RecommendationsPage from "@/pages/user/recommendations";
import ApplicationsPage from "@/pages/user/applications";
import ProfilePage from "@/pages/user/profile";
import CompanyProfilePage from "@/pages/user/company-profile";
import JobApplicationPage from "@/pages/user/apply";
import { AuthProvider } from "@/features/auth/AuthProvider";
import RequireEmployerStatus from "@/features/employer-registration/RequireEmployerStatus";
import EmployerRoutePlaceholder from "@/features/employer-registration/components/EmployerRoutePlaceholder";
import EmployerRegisterPage from "@/pages/employer/register";
import EmployerVerifyEmailPage from "@/pages/employer/verify-email";
import EmployerOverviewPage from "@/pages/employer/overview";
import EmployerJobListingPage from "@/pages/employer/jobListing";
import EmployerJobListingReviewPage from "@/pages/employer/jobListing/review";
import EmployerHiringSetupPage from "@/pages/employer/hiring-setup";
import EmployerApplicantsPage from "@/pages/employer/applicants/pipeline";
import EmployerApplicantDetailPage from "@/pages/employer/applicants/detail";
import EmployerCompanyProfilePage from "@/pages/employer/company-profile";
import EmployerVerificationPage from "@/pages/employer/verification";
import ApplicantMessagesPage from "@/pages/user/messages";
import EmployerMessagesPage from "@/pages/employer/messages";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<PageSkeleton label="Loading page" />}>
        <Routes>
          <Route element={<GuestLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route path="/job-search" element={<JobSearchPage />} />
          <Route path="/ojt-search" element={<OjtSearchPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/messages" element={<ApplicantMessagesPage />} />
          <Route path="/messages/:conversationId" element={<ApplicantMessagesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/company/:companyName" element={<CompanyProfilePage />} />
          <Route path="/apply/:jobId" element={<JobApplicationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/employer/register"
            element={
              <RequireEmployerStatus access="register">
                <EmployerRegisterPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/verify-email"
            element={
              <RequireEmployerStatus access="verify-email">
                <EmployerVerifyEmailPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/verification"
            element={
              <RequireEmployerStatus access="verification">
                <EmployerVerificationPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/under-review"
            element={
              <RequireEmployerStatus access="under-review">
                <EmployerRoutePlaceholder
                  title="Your company is under review"
                  description="Verification usually takes 1 to 2 business days."
                />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/overview"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerOverviewPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/listings"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerJobListingPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/listings/review"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerJobListingReviewPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/hiring-setup"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerHiringSetupPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/applicants"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerApplicantsPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/applicants/:applicantId"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerApplicantDetailPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/messages"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerMessagesPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/messages/:conversationId"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerMessagesPage />
              </RequireEmployerStatus>
            }
          />
          <Route
            path="/employer/company-profile"
            element={
              <RequireEmployerStatus access="dashboard">
                <EmployerCompanyProfilePage />
              </RequireEmployerStatus>
            }
          />
          <Route element={<OnboardingLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>,
)
