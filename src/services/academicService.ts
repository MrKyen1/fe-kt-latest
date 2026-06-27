import { ApiEnvelope } from "../types/api";
import {
  Center,
  ClassRoom,
  CreateCenterRequest,
  CreateClassRequest,
  CreateSpecializationRequest,
  Specialization,
  UpdateCenterRequest,
  UpdateClassRequest,
  UpdateSpecializationRequest,
} from "../types/backend";
import { apiClient, unwrapData } from "./apiClient";

function crudService<TItem, TCreate, TUpdate>(path: string) {
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

export const academicService = {
  centers: crudService<Center, CreateCenterRequest, UpdateCenterRequest>("/centers"),
  classes: crudService<ClassRoom, CreateClassRequest, UpdateClassRequest>("/classes"),
  specializations: crudService<
    Specialization,
    CreateSpecializationRequest,
    UpdateSpecializationRequest
  >("/specializations"),
};
