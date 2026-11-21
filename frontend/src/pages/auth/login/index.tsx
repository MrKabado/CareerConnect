import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import {
  employerRegistrationApi,
  getEmployerStatusPath,
} from "@/features/employer-registration/api";
import LoginPageView from "@/components/ui/LoginPageView";

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
      const authenticatedUser = await login(
        {
          email,
          password: String(formData.get("password") ?? ""),
        },
        formData.has("remember"),
      );
      if (authenticatedUser.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (authenticatedUser.role === "employer") {
        navigate(
          getEmployerStatusPath(
            employerRegistrationApi.getSnapshot()?.status,
          ),
          { replace: true },
        );
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
