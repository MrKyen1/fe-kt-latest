import axios, {
  AxiosError,
  AxiosInstance,
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

// While a deploy runs, Nginx answers every API call with 503 + Retry-After (the API never sends it).
type MaintenanceListener = () => void;
const maintenanceListeners = new Set<MaintenanceListener>();

export const subscribeToMaintenance = (listener: MaintenanceListener) => {
  maintenanceListeners.add(listener);
  return () => {
    maintenanceListeners.delete(listener);
  };
};

let reloadWhenReady = false;
/** True when a page failed to load during maintenance: only a reload can recover it. */
export const maintenanceNeedsReload = () => reloadWhenReady;

export function showMaintenance(reload = false) {
  reloadWhenReady ||= reload;
  maintenanceListeners.forEach((listener) => listener());
}

export async function isApiReady() {
  try {
    return (await fetch(`${API_BASE_URL}/health/ready`, { cache: "no-store" })).ok;
  } catch {
    return false;
  }
}

const READY_POLL_MS = 15_000;
let apiBack: { promise: Promise<void>; check: () => Promise<void> } | null = null;

/** Resolves once the API answers again; every waiter shares one polling loop. */
export function waitForApi() {
  if (!apiBack) {
    let resolve!: () => void;
    let timer = 0;
    let running: Promise<void> | null = null;
    const promise = new Promise<void>((done) => { resolve = done; });
    const check = () => running ??= (async () => {
      window.clearTimeout(timer);
      if (await isApiReady()) {
        apiBack = null;
        resolve();
      } else {
        timer = window.setTimeout(() => void check(), READY_POLL_MS);
      }
      running = null;
    })();
    apiBack = { promise, check };
    timer = window.setTimeout(() => void check(), READY_POLL_MS);
  }
  return apiBack.promise;
}

/** Check right away instead of waiting for the next poll. */
export const checkApiNow = () => apiBack?.check() ?? Promise.resolve();

const isMaintenanceError = (error: unknown): error is AxiosError =>
  axios.isAxiosError(error) && error.response?.status === 503 && !!error.response.headers["retry-after"];

/**
 * Nginx rejects these before proxying, so the API never saw the request: holding
 * and resending it is safe even for writes, and the page keeps all its state.
 */
async function resendAfterMaintenance(client: AxiosInstance, error: AxiosError) {
  showMaintenance();
  await waitForApi();
  return client(error.config!);
}

refreshClient.interceptors.response.use(undefined, (error) =>
  isMaintenanceError(error) && error.config ? resendAfterMaintenance(refreshClient, error) : Promise.reject(error));

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
      if (stillCurrent() && !isTransientApiError(error)) {
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
    if (isMaintenanceError(error) && error.config) return resendAfterMaintenance(apiClient, error);
    // File endpoints still return JSON on authentication/validation failures.
    // Decode a small error body before normalization so password errors remain useful.
    const errorBody: unknown = error.response?.data;
    if (
      error.response && typeof Blob !== "undefined" &&
      errorBody instanceof Blob && errorBody.size <= 65_536 &&
      errorBody.type.includes("json")
    ) {
      try {
        error.response.data = JSON.parse(await errorBody.text()) as ApiErrorBody;
      } catch {
        // Fall back to the HTTP status if the response is not valid JSON.
      }
    }
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

/** Outages, maintenance and throttling say nothing about the session: keep the user signed in. */
export function isTransientApiError(error: unknown) {
  const status = axios.isAxiosError(error) ? error.response?.status : (error as ApiError | undefined)?.statusCode;
  return status === undefined || status >= 500 || status === 408 || status === 429;
}

// Answers that never reach the API (nginx pages, timeouts) carry no JSON
// message: still tell the user what happened and what to do.
const STATUS_MESSAGES: Record<number, string> = {
  408: "Yêu cầu xử lý quá thời gian. Hãy thu hẹp bộ lọc rồi thử lại.",
  413: "Tệp quá lớn so với giới hạn cho phép. Hãy giảm dung lượng tệp rồi tải lại.",
  429: "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.",
  502: "Máy chủ đang khởi động lại. Vui lòng thử lại sau ít phút.",
  503: "Máy chủ đang bận. Vui lòng thử lại sau ít phút.",
  504: "Máy chủ phản hồi quá lâu. Hãy thu hẹp bộ lọc rồi thử lại.",
};

export function normalizeApiError(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body?.message) {
      const msg = Array.isArray(body.message) ? (body.message as string[]).join(", ") : String(body.message);
      // Nginx maintenance JSON has a message but no statusCode field.
      return new ApiError(msg, { statusCode: error.response?.status, ...body });
    }

    if (error.response?.status) {
      return new ApiError(STATUS_MESSAGES[error.response.status] ?? error.message, {
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
  // The server's own message wins; the status fallback only replaces axios'
  // generic "Request failed with status code ..." text.
  const ownMsg = anyErr?.response?.data?.message
    || (/^Request failed with status code/.test(anyErr?.message ?? "") ? undefined : anyErr?.message);
  const rawMsg = ownMsg || STATUS_MESSAGES[anyErr?.response?.status ?? anyErr?.statusCode];
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
