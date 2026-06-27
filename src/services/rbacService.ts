import { ApiEnvelope } from "../types/api";
import {
  Permission,
  Role,
  RolePermission,
  RolePermissionMatrix,
} from "../types/backend";
import { apiClient, unwrapData } from "./apiClient";

interface RoleRequest {
  code: string;
  name: string;
  description?: string;
}

interface PermissionRequest {
  code: string;
  name: string;
  description?: string;
}

interface RolePermissionRequest {
  roleId: string;
  permissionId: string;
}

interface SyncRolePermissionMatrixRequest {
  roleIds: string[];
  permissionIds: string[];
  assignments: RolePermissionRequest[];
}

function rbacCrud<TItem, TCreate, TUpdate = Partial<TCreate>>(path: string) {
  return {
    async create(payload: TCreate): Promise<TItem> {
      return unwrapData(await apiClient.post<ApiEnvelope<TItem>>(path, payload));
    },

    async list(params?: Record<string, unknown>): Promise<TItem[]> {
      return unwrapData(await apiClient.get<ApiEnvelope<TItem[]>>(path, { params }));
    },

    async get(id: string): Promise<TItem> {
      return unwrapData(await apiClient.get<ApiEnvelope<TItem>>(`${path}/${id}`));
    },

    async update(id: string, payload: TUpdate): Promise<TItem> {
      return unwrapData(await apiClient.patch<ApiEnvelope<TItem>>(`${path}/${id}`, payload));
    },

    async remove(id: string): Promise<TItem> {
      return unwrapData(await apiClient.delete<ApiEnvelope<TItem>>(`${path}/${id}`));
    },
  };
}

export const rbacService = {
  roles: rbacCrud<Role, RoleRequest>("/roles"),
  permissions: rbacCrud<Permission, PermissionRequest>("/permissions"),

  rolePermissions: {
    ...rbacCrud<RolePermission, RolePermissionRequest>("/role-permissions"),

    async matrix(): Promise<RolePermissionMatrix> {
      return unwrapData(
        await apiClient.get<ApiEnvelope<RolePermissionMatrix>>("/role-permissions/matrix"),
      );
    },

    async syncMatrix(payload: SyncRolePermissionMatrixRequest): Promise<RolePermissionMatrix> {
      return unwrapData(
        await apiClient.put<ApiEnvelope<RolePermissionMatrix>>(
          "/role-permissions/matrix",
          payload,
        ),
      );
    },
  },
};
