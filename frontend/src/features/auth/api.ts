export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "applicant" | "employer";
  account_status: string;
  email_verified_at: string | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationDetails = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: "applicant" | "employer";
};

type RegistrationResponse = {
  message: string;
  user: AuthUser;
};

type LoginResponse = {
  token_type: "Bearer";
  token: string;
  user: AuthUser;
};

type UserResponse = {
  user: AuthUser;
};

type EmailVerificationResponse = {
  message: string;
  token_type: "Bearer";
  token: string;
  user: AuthUser;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api")
  .replace(/\/+$/, "");

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });
  const responseText = await response.text();
  let responseBody: unknown;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        throw new ApiError(responseText, response.status);
      }

      throw new Error("The server returned an invalid JSON response.");
    }
  }

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : `Request failed with status ${response.status}.`;

    throw new ApiError(message, response.status);
  }

  return responseBody as T;
}

export const authApi = {
  register(details: RegistrationDetails) {
    return apiRequest<RegistrationResponse>("/register", {
      method: "POST",
      body: JSON.stringify(details),
    });
  },

  login(credentials: LoginCredentials) {
    return apiRequest<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  me(token: string) {
    return apiRequest<UserResponse>("/user", {}, token);
  },

  requestEmailVerificationCode(email: string) {
    return apiRequest<{ message: string }>("/otp/request", {
      method: "POST",
      body: JSON.stringify({ email, purpose: "email_verification" }),
    });
  },

  verifyEmail(email: string, code: string) {
    return apiRequest<EmailVerificationResponse>("/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  logout(token: string) {
    return apiRequest<{ message: string }>(
      "/logout",
      { method: "POST" },
      token,
    );
  },

  requestPasswordReset(email: string) {
    return apiRequest<{ message: string }>("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(details: {
    email: string;
    code: string;
    password: string;
    password_confirmation: string;
  }) {
    return apiRequest<{ message: string }>("/reset-password", {
      method: "POST",
      body: JSON.stringify(details),
    });
  },
};
