import ApplicationsPageContent from "@/features/user-applications/components/ApplicationsPageContent";
import { useUserApplications } from "@/features/user-applications/hooks/useUserApplications";

export default function ApplicationsPage() {
  return <ApplicationsPageContent {...useUserApplications()} />;
}