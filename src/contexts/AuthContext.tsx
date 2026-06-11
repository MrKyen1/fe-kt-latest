import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService } from "../services/authService";
import { tokenStorage } from "../services/tokenStorage";

interface User {
  id: string;
  code: string;
  username: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permissions: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapStoredUser(user: NonNullable<ReturnType<typeof tokenStorage.getUser>>): User {
  return {
    id: user.id,
    code: user.code,
    username: user.username || user.code,
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar,
    role: user.role.code,
    permissions: user.role.permissions ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const storedUser = tokenStorage.getUser();
    if (storedUser && tokenStorage.getAccessToken()) {
      setUser(mapStoredUser(storedUser));

      authService
        .me()
        .then((freshUser) => setUser(mapStoredUser(freshUser)))
        .catch(() => {
          tokenStorage.clear();
          setUser(null);
        })
        .finally(() => setIsInitializing(false));
      return;
    }

    setIsInitializing(false);
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const session = await authService.login({ identifier, password });
      setUser(mapStoredUser(session.user));
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  };

  const hasRole = (roles: string | string[]) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  const hasPermission = (permissions: string | string[]) => {
    if (!user) return false;
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];
    if (permissionList.length === 0) return true;
    return permissionList.every((permission) => user.permissions.includes(permission));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isInitializing,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
