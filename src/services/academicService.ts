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
      // Backend mới bổ sung pagination mặc định limit=20; gửi limit: 100 nếu chưa chỉ định để không thiếu dữ liệu dropdown/danh sách
      const queryParams = { limit: 100, ...params };
      const response = await apiClient.get<ApiEnvelope<TItem[]>>(path, { params: queryParams });
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
  centers: {
    ...crudService<Center, CreateCenterRequest, UpdateCenterRequest>("/centers"),
    async publicList(): Promise<Center[]> {
      const response = await apiClient.get<ApiEnvelope<Center[]>>("/centers/public");
      return unwrapData(response).filter((center) => center.isActive !== false);
    },
    async reactivate(id: string): Promise<Center> {
      return unwrapData(await apiClient.patch<ApiEnvelope<Center>>(`/centers/${id}/reactivate`));
    },
  },
  classes: {
    ...crudService<ClassRoom, CreateClassRequest, UpdateClassRequest>("/classes"),
    async reactivate(id: string): Promise<ClassRoom> {
      return unwrapData(await apiClient.patch<ApiEnvelope<ClassRoom>>(`/classes/${id}/reactivate`));
    },
  },
  specializations: {
    ...crudService<
      Specialization,
      CreateSpecializationRequest,
      UpdateSpecializationRequest
    >("/specializations"),
    async reactivate(id: string): Promise<Specialization> {
      return unwrapData(await apiClient.patch<ApiEnvelope<Specialization>>(`/specializations/${id}/reactivate`));
    },
  },
};
