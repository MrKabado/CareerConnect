import { lazy } from "react";

export const HomePage = lazy(() => import("@/pages/(guest)/home/index"));
export const LoginPage = lazy(() => import("@/pages/auth/login"));
export const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
export const VerifyEmailPage = lazy(() => import("@/pages/auth/verify-email"));
export const OnboardingPage = lazy(() => import("@/pages/onboarding"));
export const JobSearchPage = lazy(() => import("@/pages/user/job-search"));
export const OjtSearchPage = lazy(() => import("@/pages/user/ojt-search"));
export const RecommendationsPage = lazy(
  () => import("@/pages/user/recommendations"),
);
export const ApplicationsPage = lazy(() => import("@/pages/user/applications"));
export const ProfilePage = lazy(() => import("@/pages/user/profile"));
export const CompanyProfilePage = lazy(() => import("@/pages/user/company-profile"));
export const JobApplicationPage = lazy(() => import("@/pages/user/apply"));
export const ApplicantMessagesPage = lazy(() => import("@/pages/user/messages"));
export const EmployerMessagesPage = lazy(() => import("@/pages/employer/messages"));
export const EmployerRegisterPage = lazy(() => import("@/pages/employer/register"));
export const EmployerApprovalPage = lazy(
  () => import("@/features/employer-registration/components/EmployerApprovalPage"),
);
export const EmployerVerifyEmailPage = lazy(
  () => import("@/pages/employer/verify-email"),
);
export const EmployerOverviewPage = lazy(() => import("@/pages/employer/overview"));
export const EmployerJobListingPage = lazy(
  () => import("@/pages/employer/jobListing"),
);
export const EmployerJobListingReviewPage = lazy(
  () => import("@/pages/employer/jobListing/review"),
);
export const EmployerHiringSetupPage = lazy(
  () => import("@/pages/employer/hiring-setup"),
);
export const EmployerApplicantsPage = lazy(
  () => import("@/pages/employer/applicants/pipeline"),
);
export const EmployerApplicantDetailPage = lazy(
  () => import("@/pages/employer/applicants/detail"),
);
export const EmployerCompanyProfilePage = lazy(
  () => import("@/pages/employer/company-profile"),
);
export const EmployerVerificationPage = lazy(
  () => import("@/pages/employer/verification"),
);
export const EmployerCompanyInformationPage = lazy(
  () =>
    import(
      "@/features/employer-verification/components/EmployerCompanyInformationPage"
    ),
);
