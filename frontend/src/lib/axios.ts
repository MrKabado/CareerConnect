import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api")
  .replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
  validateStatus: (status) => status >= 200 && status < 300,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message =
      typeof error.response?.data === "object" &&
      error.response.data !== null &&
      typeof error.response.data.message === "string"
        ? error.response.data.message
        : error.message || "Request failed.";

    return Promise.reject(new ApiError(message, error.response?.status ?? 0));
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

export default apiClient;
