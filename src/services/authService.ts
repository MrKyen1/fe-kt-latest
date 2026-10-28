import { unwrapData, apiClient, normalizeUser, refreshAuthSession, waitForAuthRefresh } from "./apiClient";
import { tokenStorage, isTokenExpired } from "./tokenStorage";
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
    const data = await refreshAuthSession(refreshToken);
    const session = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: normalizeUser(data.user),
    };
    return session;
  },

  async logout(refreshToken?: string | null, accessToken?: string | null) {
    let refresh = refreshToken ?? tokenStorage.getRefreshToken();
    let access = accessToken ?? tokenStorage.getAccessToken();
    if (!refresh) return;
    try {
      const pending = waitForAuthRefresh(true);
      if (pending || isTokenExpired(access)) {
        const session = await (pending ?? refreshAuthSession(refresh, true));
        access = session.accessToken;
        refresh = session.refreshToken;
      }
      // Revoke the captured session even if local logout timed out or a new
      // account signed in meanwhile. Explicit headers never use the new session.
      await apiClient.post(
        "/auth/logout",
        { refreshToken: refresh },
        {
          headers: { Authorization: `Bearer ${access}` },
          timeout: 2000,
          _skipAuthRefresh: true,
        } as any,
      );
    } catch {
      // Best-effort logout notification: ignore server/network failures silently
    }
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
    const version = tokenStorage.getSessionVersion();
    const user = unwrapData(
      await apiClient.patch<import("../types/api").ApiEnvelope<BackendAuthResponse["user"]>>(
        "/auth/me",
        payload,
      ),
    );
    if (version !== tokenStorage.getSessionVersion()) {
      throw new Error("Phiên đăng nhập đã thay đổi");
    }
    // PATCH returns basic User fields; preserve the scoped relations from /auth/me.
    const existingUser = tokenStorage.getUser();
    const normalized = normalizeUser({
      ...(existingUser?.id === user.id ? existingUser : {}),
      ...user,
      role: user.role ?? (existingUser?.id === user.id ? existingUser.role : undefined),
    } as BackendAuthResponse["user"]);
    tokenStorage.setUser(normalized);
    return normalized;
  },

  async changePassword(payload: ChangePasswordRequest) {
    return unwrapData(await apiClient.patch("/auth/change-password", payload));
  },

  async resetStudentPassword(payload: ResetPasswordRequest) {
    return unwrapData(await apiClient.post<import("../types/api").ApiEnvelope<ResetPasswordResponse>>(
      "/auth/reset-student-password", payload,
    ));
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

