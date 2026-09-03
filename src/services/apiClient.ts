import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiEnvelope, ApiError, ApiErrorBody, ApiListResult } from "../types/api";
import { tokenStorage } from "./tokenStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const API_ORIGIN = (() => {
  try {
    if (API_BASE_URL.startsWith("/")) {
      return typeof window !== "undefined" ? window.location.origin : "";
    }
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication failure event subscription to notify the UI context
type AuthFailureListener = () => void;
const authFailureListeners = new Set<AuthFailureListener>();

export const subscribeToAuthFailure = (listener: AuthFailureListener) => {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
};

const notifyAuthFailure = () => {
  authFailureListeners.forEach((listener) => listener());
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const refreshToken = tokenStorage.getRefreshToken();

    if (status === 401 && originalRequest && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await refreshClient.post<ApiEnvelope<AuthRefreshResponse>>(
          "/auth/refresh",
          { refreshToken },
        );
        const nextSession = refreshResponse.data.data;
        tokenStorage.setTokens(nextSession.accessToken, nextSession.refreshToken);
        tokenStorage.setUser(normalizeUser(nextSession.user));

        originalRequest.headers.Authorization = `Bearer ${nextSession.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenStorage.clear();
        notifyAuthFailure();
        return Promise.reject(normalizeApiError(refreshError));
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

interface BackendUser {
  id: string;
  code: string;
  fullName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  avatar?: string;
  role: {
    id: string;
    code: string;
    name?: string;
    permissions?: string[];
  };
}

export function normalizeUser(user: BackendUser) {
  return {
    ...user,
    username: user.code,
    role: user.role ? {
      ...user.role,
      permissions: user.role.permissions ?? [],
    } : undefined as any,
  };
}

export function normalizeApiError(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body?.message) {
      const msg = Array.isArray(body.message) ? (body.message as string[]).join(", ") : String(body.message);
      return new ApiError(msg, body);
    }

    if (error.response?.status) {
      return new ApiError(error.message, {
        statusCode: error.response.status,
        errorCode: "HTTP_ERROR",
      });
    }
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Unknown API error");
}

export function getErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra"): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  const anyErr = error as any;
  if (anyErr?.response?.data?.message) {
    const msg = anyErr.response.data.message;
    return Array.isArray(msg) ? msg.join(", ") : String(msg);
  }
  if (anyErr?.message) {
    const msg = anyErr.message;
    return Array.isArray(msg) ? msg.join(", ") : String(msg);
  }
  return fallback;
}

export function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data;
}

export function unwrapList<T>(response: AxiosResponse<ApiEnvelope<T[]>>): ApiListResult<T> {
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export function resolveMediaUrl(url: string) {
  if (!url || url.startsWith("http") || url.startsWith("data:")) return url;
  const origin = API_ORIGIN;
  const separator = (origin.endsWith("/") || url.startsWith("/")) ? "" : "/";
  return `${origin}${separator}${url}`;
}
