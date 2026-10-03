import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  permissionMode?: 'all' | 'any';
}

export function ProtectedRoute({ children, roles, permissions, permissionMode = 'all' }: ProtectedRouteProps) {
  const { isLoggedIn, isInitializing, hasRole, hasPermission } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !hasRole(roles)) {
    return <Navigate to="/home" replace />;
  }

  if (permissions?.length && !hasPermission(permissions, { mode: permissionMode })) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
