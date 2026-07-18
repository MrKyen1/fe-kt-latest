import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService } from "../services/authService";
import { tokenStorage } from "../services/tokenStorage";
import { subscribeToAuthFailure } from "../services/apiClient";
import { userService } from "../services/userService";

interface User {
  id: string;
  code: string;
  username: string;
  fullName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  avatar?: string;
  role: string;
  permissions: string[];
  teacherProfile?: any;
  studentProfile?: any;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permissions: string | string[]) => boolean;
  updateUser: (updatedUser: NonNullable<ReturnType<typeof tokenStorage.getUser>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapStoredUser(user: NonNullable<ReturnType<typeof tokenStorage.getUser>>): User {
  const code = user.code;
  let studentProfile = (user as any).studentProfile;
  let teacherProfile = (user as any).teacherProfile;

  return {
    id: user.id,
    code: user.code,
    username: user.username || user.code,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    address: user.address,
    avatar: user.avatar,
    role: user.role.code,
    permissions: user.role.permissions ?? [],
    teacherProfile,
    studentProfile,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchAndMergeDetails = async (currentUser: User) => {
    const hasUsersManage = currentUser.permissions?.includes("users.manage") || currentUser.role === "teacher" || currentUser.role === "admin";
    if (hasUsersManage) {
      try {
        const detail = await userService.get(currentUser.id);
        const merged = {
          ...currentUser,
          teacherProfile: detail.teacherProfile || currentUser.teacherProfile,
          studentProfile: detail.studentProfile || currentUser.studentProfile,
        };
        setUser(merged);
        tokenStorage.setUser({
          ...tokenStorage.getUser(),
          teacherProfile: detail.teacherProfile || undefined,
          studentProfile: detail.studentProfile || undefined,
        } as any);
      } catch (err) {
        console.warn("Failed to fetch detailed profile in background:", err);
      }
    }
  };

  useEffect(() => {
    // Subscribe to automatic logout when refresh token fails
    const unsubscribe = subscribeToAuthFailure(() => {
      setUser(null);
    });

    const storedUser = tokenStorage.getUser();
    const hasToken = !!tokenStorage.getAccessToken();
    
    if (hasToken) {
      if (storedUser) {
        const initial = mapStoredUser(storedUser);
        setUser(initial);
        fetchAndMergeDetails(initial);
      }

      authService
        .me()
        .then((freshUser) => {
          const mapped = mapStoredUser(freshUser);
          setUser(mapped);
          fetchAndMergeDetails(mapped);
        })
        .catch(() => {
          tokenStorage.clear();
          setUser(null);
        })
        .finally(() => setIsInitializing(false));
      return;
    }

    setIsInitializing(false);
    return unsubscribe;
  }, []);

  const login = async (identifier: string, password: string) => {
    const session = await authService.login({ identifier, password });
    const mapped = mapStoredUser(session.user);
    setUser(mapped);
    await fetchAndMergeDetails(mapped);
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      authService.logout(refreshToken).catch((error) => {
        console.error("Background logout failed:", error);
      });
    }
    tokenStorage.clear();
    setUser(null);
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

  const updateUser = (updatedUser: Parameters<typeof mapStoredUser>[0]) => {
    setUser(mapStoredUser(updatedUser));
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
        updateUser,
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
