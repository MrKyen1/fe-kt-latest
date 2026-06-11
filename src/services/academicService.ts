import { ApiEnvelope } from "../types/api";
import { apiClient, unwrapData } from "./apiClient";

function crudService(path: string) {
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

export const academicService = {
  centers: crudService("/centers"),
  classes: crudService("/classes"),
  specializations: crudService("/specializations"),
};

