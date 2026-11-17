import { apiRequest } from "@/lib/axios";

export { apiRequest, ApiError } from "@/lib/axios";

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

export const authApi = {
  register(details: RegistrationDetails) {
    return apiRequest<RegistrationResponse>("/register", {
      method: "POST",
      data: details,
    });
  },

  login(credentials: LoginCredentials) {
    return apiRequest<LoginResponse>("/login", {
      method: "POST",
      data: credentials,
    });
  },

  me(token: string) {
    return apiRequest<UserResponse>("/user", {}, token);
  },

  requestEmailVerificationCode(email: string) {
    return apiRequest<{ message: string }>("/otp/request", {
      method: "POST",
      data: { email, purpose: "email_verification" },
    });
  },

  verifyEmail(email: string, code: string) {
    return apiRequest<EmailVerificationResponse>("/otp/verify", {
      method: "POST",
      data: { email, code },
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
      data: { email },
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
      data: details,
    });
  },
};
