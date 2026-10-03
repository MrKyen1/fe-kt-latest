import { Navigate } from "react-router-dom";

/**
 * Trang Quản lý Phân quyền (RBAC) đã được loại bỏ khỏi giao diện.
 * Hệ thống hiện áp dụng phân quyền tĩnh (hardcoded) theo từng vai trò (role).
 */
export default function RbacManagement() {
  return <Navigate to="/admin/dashboard" replace />;
}
