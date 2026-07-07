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
      // Thử unwrapData trước (nếu BE trả thẳng array), nếu không thì unwrap từ paginated
      const response = await apiClient.get<ApiEnvelope<TItem[]>>(path, { params });
      // BE có thể trả { data: [...] } (array) hoặc { data: [...], meta: {...} } (paginated)
      const payload = response.data?.data;
      if (Array.isArray(payload)) return payload;
      // Fallback nếu data wrapped lạ
      return (payload as any) ?? [];
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
