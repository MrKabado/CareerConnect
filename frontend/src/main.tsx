import "@/styles/global.css";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PageSkeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/layouts/adminlayout";
import GuestLayout from "@/layouts/guestLayout";
import OnboardingLayout from "@/layouts/onboardingLayout";
import { AuthProvider } from "@/features/auth/AuthProvider";
import RequireAuth from "@/features/auth/RequireAuth";
import RequireGuest from "@/features/auth/RequireGuest";
import RequireRole from "@/features/auth/RequireRole";
import RequireEmployerStatus from "@/features/employer-registration/RequireEmployerStatus";
import EmployerRoutePlaceholder from "@/features/employer-registration/components/EmployerRoutePlaceholder";
import CategoriesPage from "@/page/admin/CategoryCard";
import ApplicantIdentityVerificationPage from "@/page/admin/ApplicantIdentityVerificationPage";
import ReportsPage from "@/page/admin/ReportsPage";
import UsersPage from "@/page/admin/StatCard";
import VerificationPage from "@/page/admin/VerificationPage";
import JobListingApprovalsPage from "@/page/admin/JobListingApprovalsPage";
import AdminJobListingsPage from "@/page/admin/AdminJobListingsPage";
import EmployerReportsPage from "@/page/admin/EmployerReportsPage";
import {
  ApplicationsPage,
  ApplicantMessagesPage,
  CompanyProfilePage,
  EmployerApplicantsPage,
  EmployerApplicantDetailPage,
  EmployerApprovalPage,
  EmployerCompanyProfilePage,
  EmployerCompanyInformationPage,
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
import NotFoundPage from "@/pages/NotFoundPage";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<PageSkeleton label="Loading page" />}>
        <Routes>
          <Route element={<GuestLayout />}>
            <Route path="/" element={<RequireGuest><HomePage /></RequireGuest>} />
          </Route>
          <Route path="/job-search" element={<JobSearchPage />} />
          <Route path="/ojt-search" element={<OjtSearchPage />} />
          <Route path="/recommendations" element={<RequireAuth><RequireRole role="applicant"><RecommendationsPage /></RequireRole></RequireAuth>} />
          <Route path="/applications" element={<RequireAuth><RequireRole role="applicant"><ApplicationsPage /></RequireRole></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><RequireRole role="applicant"><ApplicantMessagesPage /></RequireRole></RequireAuth>} />
          <Route path="/messages/:conversationId" element={<RequireAuth><RequireRole role="applicant"><ApplicantMessagesPage /></RequireRole></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><RequireRole role="applicant"><ProfilePage /></RequireRole></RequireAuth>} />
          <Route path="/company/:companyName" element={<CompanyProfilePage />} />
          <Route path="/apply/:jobId" element={<RequireAuth><RequireRole role="applicant"><JobApplicationPage /></RequireRole></RequireAuth>} />
          <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
          <Route path="/forgot-password" element={<RequireGuest><ForgotPasswordPage /></RequireGuest>} />
          <Route path="/verify-email" element={<RequireGuest><VerifyEmailPage /></RequireGuest>} />
          <Route
            path="/employer/register"
            element={
              <RequireGuest>
                <RequireEmployerStatus access="register">
                  <EmployerRegisterPage />
                </RequireEmployerStatus>
              </RequireGuest>
            }
          />
          <Route path="/employer/approved" element={<EmployerApprovalPage />} />
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
            path="/employer/verification/company-info"
            element={
              <RequireAuth>
                <RequireRole role="employer">
                  <RequireEmployerStatus access="company-info">
                    <EmployerCompanyInformationPage />
                  </RequireEmployerStatus>
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/employer/verification/email"
            element={<Navigate to="/employer/verify-email" replace />}
          />
          <Route
            path="/employer/verification/documents"
            element={<Navigate to="/employer/verification" replace />}
          />
          <Route
            path="/employer/verification/review"
            element={<Navigate to="/employer/under-review" replace />}
          />
          <Route
            path="/employer/under-review"
            element={
              <RequireEmployerStatus access="under-review">
                <EmployerRoutePlaceholder
                  title="Company verification pending approval"
                  description="Your verification request was submitted successfully. A CareerConnect administrator is reviewing your documents. You will be notified here when a decision is made."
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
            <Route path="/onboarding" element={<RequireGuest><OnboardingPage /></RequireGuest>} />
          </Route>
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole role="admin">
                  <AdminLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route index element={<ReportsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="verifications" element={<VerificationPage />} />
            <Route path="applicant-verifications" element={<ApplicantIdentityVerificationPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="job-approvals" element={<JobListingApprovalsPage />} />
            <Route path="job-listings" element={<AdminJobListingsPage />} />
            <Route path="employer-reports" element={<EmployerReportsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="/reports" element={<Navigate to="/admin" replace />} />
          <Route
            path="/verifications"
            element={<Navigate to="/admin/verifications" replace />}
          />
          <Route
            path="/categories"
            element={<Navigate to="/admin/categories" replace />}
          />
          <Route path="/users" element={<Navigate to="/admin/users" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <Toaster position="top-center" richColors />
    </AuthProvider>
  </BrowserRouter>,
);

