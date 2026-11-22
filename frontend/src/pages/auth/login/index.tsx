import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import LoginPageView from "@/components/ui/LoginPageView";
import { employerVerificationFilesApi } from "@/features/employer-verification/backendApi";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoginError(null);
    setVerificationEmail(null);
    setIsSubmitting(true);

    try {
      const email = String(formData.get("email") ?? "");
      const loginResult = await login(
        {
          email,
          password: String(formData.get("password") ?? ""),
        },
        formData.has("remember"),
      );
      if (loginResult.user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (loginResult.user.role === "employer") {
        const verification = await employerVerificationFilesApi.status(loginResult.token);
        if (verification.status === "pending") {
          navigate("/employer/under-review", { replace: true });
        } else if (verification.status === "verified") {
          navigate("/employer/overview", { replace: true });
        } else if (verification.status === "rejected") {
          navigate("/employer/verification", { replace: true });
        } else if (verification.company_profile_complete) {
          navigate("/employer/verification", { replace: true });
        } else {
          navigate("/employer/verification/company-info", { replace: true });
        }
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to log in.";
      setLoginError(message);
      if (message.toLowerCase().includes("verify your email address")) {
        setVerificationEmail(String(formData.get("email") ?? "").trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LoginPageView
      isSubmitting={isSubmitting}
      loginError={loginError}
      verificationEmail={verificationEmail}
      onSubmit={handleSubmit}
    />
  );
}
