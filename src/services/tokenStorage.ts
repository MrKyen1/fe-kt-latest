export interface StoredUser {
  id: string;
  code: string;
  username: string;
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
    permissions: string[];
  };
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

const STORAGE_KEYS = {
  accessToken: "kata_access_token",
  refreshToken: "kata_refresh_token",
  user: "kata_user",
};

export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  },

  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  },

  getUser(): StoredUser | null {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      this.clear();
      return null;
    }
  },

  setSession(session: AuthSession) {
    localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));
  },

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  },

  setUser(user: StoredUser) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem("user");
  },

  isAccessTokenExpired(): boolean {
    return isTokenExpired(this.getAccessToken());
  },

  isRefreshTokenExpired(): boolean {
    return isTokenExpired(this.getRefreshToken());
  },
};

/**
 * Kiểm tra xem JWT token đã hết hạn hay chưa dựa vào claim `exp`.
 * Tự động parse payload theo chuẩn base64url với 5 giây buffer.
 */
export function isTokenExpired(token?: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp !== "number") return false;
    // 5s buffer phòng trường hợp lệch đồng hồ mạng
    return payload.exp * 1000 <= Date.now() + 5000;
  } catch {
    return true;
  }
}
