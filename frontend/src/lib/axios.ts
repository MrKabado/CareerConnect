import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { toast } from "sonner";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://192.168.254.125:8000/api")
  .replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
  validateStatus: (status) => status >= 200 && status < 300,
});

function isActionRequest(method: string | undefined): boolean {
  return method !== undefined && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function getValidationMessage(payload: unknown): string | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("errors" in payload) ||
    typeof payload.errors !== "object" ||
    payload.errors === null
  ) {
    return null;
  }

  for (const messages of Object.values(payload.errors)) {
    if (Array.isArray(messages)) {
      const firstMessage = messages.find(
        (message): message is string =>
          typeof message === "string" && message.trim() !== "",
      );
      if (firstMessage) return firstMessage;
    }
  }

  return null;
}

function getResponseMessage(payload: unknown): string | null {
  const responseMessage =
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim() !== ""
      ? payload.message
      : null;
  const validationMessage = getValidationMessage(payload);

  if (responseMessage && validationMessage) {
    return `${responseMessage} ${validationMessage}`;
  }
  return responseMessage ?? validationMessage;
}

function getActionSuccessMessage(
  method: string | undefined,
  payload: unknown,
): string | null {
  const responseMessage = getResponseMessage(payload);
  if (responseMessage) return responseMessage;

  switch (method?.toUpperCase()) {
    case "POST":
      return "Action completed successfully.";
    case "PUT":
    case "PATCH":
      return "Changes saved successfully.";
    case "DELETE":
      return "Removed successfully.";
    default:
      return null;
  }
}

apiClient.interceptors.response.use(
  (response) => {
    if (isActionRequest(response.config.method)) {
      const message = getActionSuccessMessage(
        response.config.method,
        response.data,
      );
      if (message) toast.success(message);
    }

    return response;
  },
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const message =
      getResponseMessage(error.response?.data) ??
      (error.message || "Request failed.");
    const status = error.response?.status ?? 0;

    if (isActionRequest(error.config?.method) && status !== 422) {
      toast.error(
        status === 0
          ? "Unable to reach the server. Check your connection and try again."
          : message,
      );
    }

    return Promise.reject(new ApiError(message, status, error.response?.data?.code));
  },
);

export async function apiRequest<T>(
  path: string,
  options: AxiosRequestConfig = {},
  token?: string,
): Promise<T> {
  const headers = {
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiClient.request<T>({
    ...options,
    url: path,
    headers,
  });

  return response.data;
}

export async function apiBlob(path: string, token: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(path, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });

  return response.data;
}

export default apiClient;
