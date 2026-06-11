import { ApiEnvelope } from "../types/api";
import { apiClient, unwrapData } from "./apiClient";

function rbacCrud(path: string) {
  return {
    async create(payload: unknown) {
      return unwrapData(await apiClient.post<ApiEnvelope<unknown>>(path, payload));
    },

    async list(params?: Record<string, unknown>) {
      return unwrapData(await apiClient.get<ApiEnvelope<unknown[]>>(path, { params }));
    },

    async get(id: string) {
      return unwrapData(await apiClient.get<ApiEnvelope<unknown>>(`${path}/${id}`));
    },

    async update(id: string, payload: unknown) {
      return unwrapData(await apiClient.patch<ApiEnvelope<unknown>>(`${path}/${id}`, payload));
    },

    async remove(id: string) {
      return unwrapData(await apiClient.delete<ApiEnvelope<unknown>>(`${path}/${id}`));
    },
  };
}

export const rbacService = {
  roles: rbacCrud("/roles"),
  permissions: rbacCrud("/permissions"),

  rolePermissions: {
    ...rbacCrud("/role-permissions"),

    async matrix() {
      return unwrapData(await apiClient.get<ApiEnvelope<unknown>>("/role-permissions/matrix"));
    },

    async syncMatrix(payload: unknown) {
      return unwrapData(
        await apiClient.put<ApiEnvelope<unknown>>("/role-permissions/matrix", payload),
      );
    },
  },
};

