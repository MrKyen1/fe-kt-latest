import { unwrapData, apiClient, normalizeUser } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UpdateMeRequest,
} from "../types/auth";

interface BackendAuthResponse {
  user: Parameters<typeof normalizeUser>[0];
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const data = unwrapData(
      await apiClient.post<import("../types/api").ApiEnvelope<BackendAuthResponse>>(
        "/auth/login",
        payload,
      ),
    );
    const session = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: normalizeUser(data.user),
    };
    tokenStorage.setSession(session);
    return session;
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const data = unwrapData(
      await apiClient.post<import("../types/api").ApiEnvelope<BackendAuthResponse>>(
        "/auth/refresh",
        { refreshToken },
      ),
    );
    const session = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: normalizeUser(data.user),
    };
    tokenStorage.setSession(session);
    return session;
  },

  async logout(refreshToken = tokenStorage.getRefreshToken()) {
    if (!refreshToken) return;
    await apiClient.post("/auth/logout", { refreshToken });
  },

  async logoutAll() {
    return unwrapData(await apiClient.post("/auth/logout-all"));
  },

  async me() {
    const user = unwrapData(
      await apiClient.get<import("../types/api").ApiEnvelope<BackendAuthResponse["user"]>>(
        "/auth/me",
      ),
    );
    const normalized = normalizeUser(user);
    tokenStorage.setUser(normalized);
    return normalized;
  },

  async updateMe(payload: UpdateMeRequest) {
    const user = unwrapData(
      await apiClient.patch<import("../types/api").ApiEnvelope<BackendAuthResponse["user"]>>(
        "/auth/me",
        payload,
      ),
    );
    const normalized = normalizeUser(user);
    tokenStorage.setUser(normalized);
    return normalized;
  },

  async changePassword(payload: ChangePasswordRequest) {
    return unwrapData(await apiClient.patch("/auth/change-password", payload));
  },

  async resetPassword(payload: ResetPasswordRequest) {
    return unwrapData(
      await apiClient.post<import("../types/api").ApiEnvelope<ResetPasswordResponse>>(
        "/auth/reset-password",
        payload,
      ),
    );
  },
};

