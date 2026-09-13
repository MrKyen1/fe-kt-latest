import React, { ReactNode } from "react";
import { useAuth, PermissionCheckMode } from "../contexts/AuthContext";

export interface CanProps {
  perform?: string | string[];
  role?: string | string[];
  mode?: PermissionCheckMode;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative authorization component to conditionally render UI based on RBAC permissions and roles.
 * Supports hierarchical permissions (e.g. learning.manage covers learning.write).
 *
 * Example:
 * ```tsx
 * <Can perform="learning.write">
 *   <Button onClick={handleCreate}>Tạo mới</Button>
 * </Can>
 * ```
 */
export const Can: React.FC<CanProps> = ({
  perform,
  role,
  mode = "all",
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole } = useAuth();

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (perform && !hasPermission(perform, { mode })) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;
