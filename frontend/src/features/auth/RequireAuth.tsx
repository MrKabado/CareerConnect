import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/features/auth/useAuth";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, refresh } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center text-sm text-[#526365]">
        Loading your account…
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
          <button
            className="mt-4 rounded-lg bg-[#078b8d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#066f72]"
            onClick={() => void refresh()}
            type="button"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
