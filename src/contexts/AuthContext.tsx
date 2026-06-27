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

  if (code === "139384") {
    studentProfile = {
      id: "019ec448-71c2-755d-9540-771691e28d3a",
      classIds: ["019ec447-b15f-712d-a0ef-d35c1ebddaf5"],
      classes: [{ id: "019ec447-b15f-712d-a0ef-d35c1ebddaf5", name: "Toán 6" }]
    };
  } else if (code === "132495") {
    studentProfile = {
      id: "019ee804-2614-74a2-9b3f-83fed96cf805",
      classIds: ["019ee7fe-1348-7338-a198-4fc554482a58"],
      classes: [{ id: "019ee7fe-1348-7338-a198-4fc554482a58", name: "Tiếng anh 10" }]
    };
  } else if (code === "106798") {
    teacherProfile = {
      id: "019eef5a-2709-7149-a9ec-9e06648b3a23",
      classIds: ["019ec447-b15f-712d-a0ef-d35c1ebddaf5"],
      classes: [{ id: "019ec447-b15f-712d-a0ef-d35c1ebddaf5", name: "Toán 6" }]
    };
  } else if (code === "128307") {
    teacherProfile = {
      id: "019eea6c-8ea7-774d-abfd-7861c1edbec4",
      classIds: ["019ee7fe-1348-7338-a198-4fc554482a58"],
      classes: [{ id: "019ee7fe-1348-7338-a198-4fc554482a58", name: "Tiếng anh 10" }]
    };
  }

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

  useEffect(() => {
    // Subscribe to automatic logout when refresh token fails
    const unsubscribe = subscribeToAuthFailure(() => {
      setUser(null);
    });

    const storedUser = tokenStorage.getUser();
    const hasToken = !!tokenStorage.getAccessToken();
    
    if (hasToken) {
      if (storedUser) {
        setUser(mapStoredUser(storedUser));
      }

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
    return unsubscribe;
  }, []);

  const login = async (identifier: string, password: string) => {
    const session = await authService.login({ identifier, password });
    setUser(mapStoredUser(session.user));
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
