import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api")
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

apiClient.interceptors.response.use(
  undefined,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const message =
      getResponseMessage(error.response?.data) ??
      (error.message || "Request failed.");
    const status = error.response?.status ?? 0;

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
