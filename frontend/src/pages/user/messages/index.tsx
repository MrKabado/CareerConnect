import ApplicantMessagesPageContent from "@/features/messaging/components/ApplicantMessagesPageContent";
import RequireAuth from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/useAuth";

export default function ApplicantMessagesPage() {
  const { status } = useAuth();

  if (import.meta.env.DEV && status === "unauthenticated") {
    return <ApplicantMessagesPageContent />;
  }

  return (
    <RequireAuth>
      <ApplicantMessagesPageContent />
    </RequireAuth>
  );
}
