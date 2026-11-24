import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/useAuth";

export default function EmployerApprovalPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToSignIn() {
    setIsSigningOut(true);
    setError(null);
    try {
      await logout();
    } catch {
      setError(
        "Your browser session was cleared, but the server sign-out could not be confirmed. Continue to sign in again.",
      );
      setIsSigningOut(false);
      return;
    }

    navigate("/login", { replace: true });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f5f8f8] px-5 py-10 font-sans text-[#263a3c]">
      <section className="w-full max-w-[560px] rounded-2xl border border-[#e5eeec] bg-white p-8 shadow-[0_8px_30px_rgba(27,54,52,0.08)] max-[520px]:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#078b8d]">
          CareerConnect for employers
        </p>
        <h1 className="mt-3 text-xl font-bold text-[#293d3e]">
          Company verification approved
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#657779]">
          Your company is approved. For your security, sign in again to access your employer account.
        </p>
        {error && (
          <p className="mt-4 text-sm text-[#a2534c]" role="alert">
            {error}
          </p>
        )}
        <button
          className="mt-6 w-full rounded-xl bg-[#0d8fa2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b7a89] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSigningOut}
          onClick={() => void continueToSignIn()}
          type="button"
        >
          {isSigningOut ? "Signing out…" : "Continue to sign in"}
        </button>
        <Link
          className="mt-4 block text-center text-xs font-semibold text-[#087879] underline underline-offset-2"
          to="/"
        >
          Back to CareerConnect
        </Link>
      </section>
    </main>
  );
}
