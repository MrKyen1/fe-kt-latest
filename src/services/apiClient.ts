import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiEnvelope, ApiError, ApiErrorBody, ApiListResult } from "../types/api";
import { tokenStorage } from "./tokenStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export const API_ORIGIN = (() => {
  try {
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
    role: {
      ...user.role,
      permissions: user.role.permissions ?? [],
    },
  };
}

export function normalizeApiError(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body?.message) {
      return new ApiError(body.message, body);
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
  return `${API_ORIGIN}${url}`;
}

