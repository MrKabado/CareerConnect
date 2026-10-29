import { createContext } from "react";
import type { AuthUser, LoginCredentials } from "@/features/auth/api";

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "error";

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
  login: (credentials: LoginCredentials, remember: boolean) => Promise<AuthUser>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
