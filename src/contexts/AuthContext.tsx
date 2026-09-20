import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { authService } from "../services/authService";
import { tokenStorage } from "../services/tokenStorage";
import { subscribeToAuthFailure } from "../services/apiClient";
import { userService, mapUserResponse } from "../services/userService";
import { TeacherAuthProfile, StudentAuthProfile } from "../types/backend";

export type PermissionCheckMode = "all" | "any";

export interface PermissionCheckOptions {
  mode?: PermissionCheckMode;
}

export interface User {
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
  teacher?: TeacherAuthProfile;
  student?: StudentAuthProfile;
  teacherProfile?: any;
  studentProfile?: any;
  centerId?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permissions: string | string[], options?: PermissionCheckOptions) => boolean;
  hasAnyPermission: (permissions: string | string[]) => boolean;
  refreshProfile: () => Promise<User | null>;
  updateUser: (updatedUser: NonNullable<ReturnType<typeof tokenStorage.getUser>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// HARDCODED RBAC PERMISSIONS MATRIX
// Phân quyền cố định (hardcoded) cho từng vai trò người dùng trong hệ thống
// ============================================================================
export const HARDCODED_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "*",
    "users.read", "users.write", "users.delete", "users.manage",
    "classes.read", "classes.write", "classes.delete", "classes.manage",
    "centers.read", "centers.write", "centers.delete", "centers.manage",
    "specializations.read", "specializations.write", "specializations.delete", "specializations.manage",
    "learning.read", "learning.write", "learning.delete", "learning.publish", "learning.assign", "learning.attempt", "learning.manage", "learning.media.upload",
    "rbac.manage"
  ],
  teacher: [
    "classes.read",
    "centers.read",
    "specializations.read",
    "learning.read",
    "learning.write",
    "learning.assign",
    "learning.publish",
    "learning.media.upload"
  ],
  student: [
    "learning.read",
    "learning.attempt"
  ]
};

function checkSinglePermission(userPermissions: string[], userRole: string, requiredPerm: string): boolean {
  if (userRole === "admin") return true;

  const rolePerms = HARDCODED_ROLE_PERMISSIONS[userRole] || [];
  const allPerms = Array.from(new Set([...userPermissions, ...rolePerms]));

  if (allPerms.includes("*") || allPerms.includes(requiredPerm)) return true;

  // Hierarchical super-permissions (matching Backend PermissionsGuard)
  if (requiredPerm.startsWith("learning.") && (allPerms.includes("learning.manage") || (requiredPerm === "learning.read" && allPerms.includes("learning.write")))) {
    return true;
  }
  if (
    (requiredPerm === "classes.read" || requiredPerm === "centers.read" || requiredPerm === "specializations.read") &&
    allPerms.includes("classes.manage")
  ) {
    return true;
  }
  if (requiredPerm === "users.read" && allPerms.includes("users.manage")) {
    return true;
  }
  if (requiredPerm.startsWith("rbac.") && allPerms.includes("rbac.manage")) {
    return true;
  }

  return false;
}

function mapStoredUser(user: NonNullable<ReturnType<typeof tokenStorage.getUser>>): User {
  const mapped = mapUserResponse(user);
  const teacherProfile = (mapped as any).teacherProfile || (user as any).teacherProfile;
  const studentProfile = (mapped as any).studentProfile || (user as any).studentProfile;
  const teacher = (user as any).teacher || (mapped as any).teacher;
  const student = (user as any).student || (mapped as any).student;

  const centerId =
    (mapped as any).centerId ||
    teacherProfile?.centerId ||
    teacherProfile?.classes?.[0]?.centerId ||
    teacherProfile?.classes?.[0]?.class?.centerId ||
    teacher?.classes?.[0]?.class?.centerId ||
    studentProfile?.centerId;

  const roleCode = typeof mapped.role === "object" ? (mapped.role as any)?.code : mapped.role;
  const dynamicPermissions = (mapped.role as any)?.permissions ?? (mapped as any).permissions ?? [];
  const hardcodedPermissions = HARDCODED_ROLE_PERMISSIONS[roleCode] || [];
  const permissions = Array.from(new Set([...dynamicPermissions, ...hardcodedPermissions]));

  return {
    id: mapped.id,
    code: mapped.code,
    username: mapped.username || mapped.code,
    fullName: mapped.fullName,
    phone: mapped.phone,
    email: mapped.email,
    dateOfBirth: mapped.dateOfBirth,
    address: mapped.address,
    avatar: mapped.avatar,
    role: roleCode,
    permissions,
    teacher,
    student,
    teacherProfile,
    studentProfile,
    centerId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchAndMergeDetails = useCallback(async (currentUser: User) => {
    const canFetchUserDetail =
      currentUser.role === "admin" ||
      currentUser.permissions?.includes("users.manage") ||
      currentUser.permissions?.includes("users.read");

    if (canFetchUserDetail) {
      try {
        const detail = await userService.get(currentUser.id);
        const resolvedCenterId =
          detail.centerId ||
          currentUser.centerId ||
          detail.teacherProfile?.centerId ||
          detail.teacherProfile?.classes?.[0]?.centerId ||
          (detail.teacherProfile?.classes?.[0] as any)?.class?.centerId;
        const merged: User = {
          ...currentUser,
          centerId: resolvedCenterId,
          teacherProfile: detail.teacherProfile || currentUser.teacherProfile,
          studentProfile: detail.studentProfile || currentUser.studentProfile,
        };
        setUser(merged);
        tokenStorage.setUser({
          ...tokenStorage.getUser(),
          centerId: resolvedCenterId,
          teacherProfile: detail.teacherProfile || undefined,
          studentProfile: detail.studentProfile || undefined,
        } as any);
      } catch (err) {
        // Backend blocks or fails quietly
        console.warn("User detail fetch in background skipped or failed:", err);
      }
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    try {
      const freshUser = await authService.me();
      const mapped = mapStoredUser(freshUser);
      setUser(mapped);
      await fetchAndMergeDetails(mapped);
      return mapped;
    } catch (err) {
      console.warn("Failed to refresh profile:", err);
      return null;
    }
  }, [fetchAndMergeDetails]);

  useEffect(() => {
    // Subscribe to automatic logout when refresh token fails
    const unsubscribe = subscribeToAuthFailure(() => {
      setUser(null);
    });

    const storedUser = tokenStorage.getUser();
    const hasToken = !!tokenStorage.getAccessToken();

    if (hasToken) {
      // Nếu cả access token lẫn refresh token đều đã hết hạn, xóa session ngay
      // Tránh việc gửi request /auth/me chết gây ra lỗi 401 trên console mạng
      if (tokenStorage.isRefreshTokenExpired() && tokenStorage.isAccessTokenExpired()) {
        tokenStorage.clear();
        setUser(null);
        setIsInitializing(false);
        return unsubscribe;
      }

      if (storedUser) {
        const initial = mapStoredUser(storedUser);
        setUser(initial);
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
  }, [fetchAndMergeDetails]);

  const login = async (identifier: string, password: string) => {
    const session = await authService.login({ identifier, password });
    const mapped = mapStoredUser(session.user);
    setUser(mapped);
    await fetchAndMergeDetails(mapped);
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    const accessToken = tokenStorage.getAccessToken();

    try {
      // 1. Thu hồi session trên server với fail-safe timeout 1.5s
      // Gọi khi token credentials còn nguyên vẹn trong storage để request hợp lệ
      if (refreshToken) {
        await Promise.race([
          authService.logout(refreshToken, accessToken),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch {
      // Bỏ qua lỗi server/mạng để đảm bảo client luôn logout thành công
    } finally {
      // 2. Dọn dẹp sạch sẽ toàn bộ local state và credentials
      tokenStorage.clear();
      setUser(null);
    }
  };

  const hasRole = useCallback((roles: string | string[]) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  }, [user]);

  const hasPermission = useCallback((
    permissions: string | string[],
    options?: PermissionCheckOptions
  ) => {
    if (!user) return false;
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];
    if (permissionList.length === 0) return true;
    const mode = options?.mode || "all";
    if (mode === "any") {
      return permissionList.some((permission) =>
        checkSinglePermission(user.permissions, user.role, permission)
      );
    }
    return permissionList.every((permission) =>
      checkSinglePermission(user.permissions, user.role, permission)
    );
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string | string[]) => {
    return hasPermission(permissions, { mode: "any" });
  }, [hasPermission]);

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
        hasAnyPermission,
        refreshProfile,
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
