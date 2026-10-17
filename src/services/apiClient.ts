import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiEnvelope, ApiError, ApiErrorBody, ApiListResult } from "../types/api";
import { invalidateAfterMutation } from "./queryCache";
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
  _skipAuthRefresh?: boolean;
  _sessionVersion?: number;
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
  (config as RetryConfig)._sessionVersion = tokenStorage.getSessionVersion();
  const token = tokenStorage.getAccessToken();
  if (token && !config.headers.Authorization) {
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

let pendingRefresh: { version: number; promise: Promise<AuthRefreshResponse>; rawPromise: Promise<AuthRefreshResponse> } | null = null;

export function waitForAuthRefresh(forLogout = false) {
  return pendingRefresh?.version === tokenStorage.getSessionVersion()
    ? (forLogout ? pendingRefresh.rawPromise : pendingRefresh.promise) : null;
}

/** One rotation per session; late responses may never replace a newer session. */
export function refreshAuthSession(refreshToken = tokenStorage.getRefreshToken(), forLogout = false) {
  const version = tokenStorage.getSessionVersion();
  const pending = waitForAuthRefresh(forLogout);
  if (pending) return pending;
  if (!refreshToken || refreshToken !== tokenStorage.getRefreshToken()) {
    return Promise.reject(new ApiError("Phiên đăng nhập không còn hợp lệ"));
  }
  const stillCurrent = () => tokenStorage.getSessionVersion() === version &&
    tokenStorage.getRefreshToken() === refreshToken;
  const rawPromise = refreshClient.post<ApiEnvelope<AuthRefreshResponse>>("/auth/refresh", { refreshToken })
    .then(response => response.data.data);
  const promise = rawPromise.then(session => {
      if (!stillCurrent()) throw new ApiError("Phiên đăng nhập đã thay đổi");
      tokenStorage.setTokens(session.accessToken, session.refreshToken);
      tokenStorage.setUser(normalizeUser(session.user));
      return session;
    })
    .catch(error => {
      if (stillCurrent()) {
        tokenStorage.clear();
        notifyAuthFailure();
      }
      throw normalizeApiError(error);
    })
    .finally(() => {
      if (pendingRefresh?.promise === promise) pendingRefresh = null;
    });
  pendingRefresh = { version, promise, rawPromise };
  if (forLogout) {
    // The local logout timeout may expire before rotation returns. Only the
    // revocation path may use this response without restoring stored credentials.
    void promise.catch(() => {});
    return rawPromise;
  }
  return promise;
}

apiClient.interceptors.response.use(
  (response) => {
    invalidateAfterMutation(response.config.url ?? "", response.config.method ?? "get");
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const refreshToken = tokenStorage.getRefreshToken();

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh &&
      originalRequest._sessionVersion === tokenStorage.getSessionVersion() &&
      !["/auth/login", "/auth/refresh"].includes(originalRequest.url ?? "") &&
      refreshToken
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = tokenStorage.getAccessToken();
        // A previous refresh may have completed before this 401 arrived.
        const nextAccessToken = accessToken && !tokenStorage.isAccessTokenExpired() &&
          originalRequest.headers.Authorization !== `Bearer ${accessToken}`
          ? accessToken : (await refreshAuthSession(refreshToken)).accessToken;
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
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

  const fieldErrors = anyErr?.fieldErrors || anyErr?.response?.data?.fieldErrors;
  const rawMsg = anyErr?.response?.data?.message || anyErr?.message;
  const mainMsg = Array.isArray(rawMsg)
    ? rawMsg.join(", ")
    : (rawMsg ? String(rawMsg) : fallback);

  if (fieldErrors && typeof fieldErrors === "object") {
    const fieldMsgs = Object.entries(fieldErrors)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("; ");
    if (fieldMsgs) {
      if (!mainMsg.includes(fieldMsgs)) {
        return `${mainMsg} (${fieldMsgs})`;
      }
      return mainMsg;
    }
  }

  if (anyErr?.response?.data?.error) {
    return String(anyErr.response.data.error);
  }

  return mainMsg || fallback;
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
