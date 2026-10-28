import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiError,
  authApi,
  type AuthUser,
  type LoginCredentials,
} from "@/features/auth/api";
import { AuthContext, type AuthContextValue } from "@/features/auth/AuthContext";

const TOKEN_STORAGE_KEY = "careerconnect-token";

function getStoredToken() {
  return (
    localStorage.getItem(TOKEN_STORAGE_KEY) ??
    sessionStorage.getItem(TOKEN_STORAGE_KEY)
  );
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>(
    token ? "loading" : "unauthenticated",
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setUser(null);
      setError(null);
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await authApi.me(token);
      setUser(response.user);
      setStatus("authenticated");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearStoredToken();
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify your account.",
      );
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    authApi
      .me(token)
      .then(({ user: authenticatedUser }) => {
        if (active) {
          setUser(authenticatedUser);
          setStatus("authenticated");
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        if (
          requestError instanceof ApiError &&
          requestError.status === 401
        ) {
          clearStoredToken();
          setToken(null);
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to verify your account.",
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [token]);

  const login = useCallback(
    async (credentials: LoginCredentials, remember: boolean) => {
      const response = await authApi.login(credentials);
      clearStoredToken();
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      setError(null);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    if (token) {
      await authApi.logout(token);
    }

    clearStoredToken();
    setToken(null);
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }, [token]);

  const value = useMemo(
    () => ({ user, token, status, error, login, logout, refresh }),
    [user, token, status, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
