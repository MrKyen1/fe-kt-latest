import { ApiEnvelope, ApiListResult } from "../types/api";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

export interface UserListQuery {
  isActive?: boolean;
  search?: string;
  code?: string;
  phone?: string;
  email?: string;
  roleId?: string;
  roleCode?: string;
  classId?: string;
  centerId?: string;
  specializationId?: string;
}

export const userService = {
  async create(payload: unknown) {
    return unwrapData(await apiClient.post<ApiEnvelope<unknown>>("/users", payload));
  },

  async list(params?: UserListQuery): Promise<unknown[]> {
    return unwrapData(await apiClient.get<ApiEnvelope<unknown[]>>("/users", { params }));
  },

  async get(id: string) {
    return unwrapData(await apiClient.get<ApiEnvelope<unknown>>(`/users/${id}`));
  },

  async update(id: string, payload: unknown) {
    return unwrapData(await apiClient.patch<ApiEnvelope<unknown>>(`/users/${id}`, payload));
  },

  async remove(id: string) {
    return unwrapData(await apiClient.delete<ApiEnvelope<unknown>>(`/users/${id}`));
  },
};

