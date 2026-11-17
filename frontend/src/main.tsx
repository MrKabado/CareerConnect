import "@/styles/global.css";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { PageSkeleton } from "@/components/ui/skeleton";
import GuestLayout from "@/layouts/guestLayout";
import OnboardingLayout from "@/layouts/onboardingLayout";
import { AuthProvider } from "@/features/auth/AuthProvider";
import RequireEmployerStatus from "@/features/employer-registration/RequireEmployerStatus";
import EmployerRoutePlaceholder from "@/features/employer-registration/components/EmployerRoutePlaceholder";
import {
  ApplicationsPage,
  ApplicantMessagesPage,
  CompanyProfilePage,
  EmployerApplicantsPage,
  EmployerApplicantDetailPage,
  EmployerCompanyProfilePage,
  EmployerHiringSetupPage,
  EmployerJobListingPage,
  EmployerJobListingReviewPage,
  EmployerMessagesPage,
  EmployerOverviewPage,
  EmployerRegisterPage,
  EmployerVerificationPage,
  EmployerVerifyEmailPage,
  ForgotPasswordPage,
  HomePage,
  JobApplicationPage,
  JobSearchPage,
  LoginPage,
  OnboardingPage,
  OjtSearchPage,
  ProfilePage,
  RecommendationsPage,
  VerifyEmailPage,
} from "@/pages/lazyPages";

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
