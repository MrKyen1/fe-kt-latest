export interface StoredUser {
  id: string;
  code: string;
  username: string;
  fullName?: string;
  phone?: string;
  email?: string;
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
};

