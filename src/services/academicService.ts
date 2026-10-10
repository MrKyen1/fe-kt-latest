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
import { apiClient, unwrapData, unwrapList } from "./apiClient";

function crudService<TItem, TCreate, TUpdate>(path: string) {
  return {
    async create(payload: TCreate): Promise<TItem> {
      return unwrapData(await apiClient.post<ApiEnvelope<TItem>>(path, payload));
    },

    async list(params?: Record<string, unknown>): Promise<TItem[]> {
      // Single-page helper; paginated UI uses useServerPagination.
      const queryParams = { limit: 20, ...params };
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
    async publicList(signal?: AbortSignal): Promise<Center[]> {
      // The public footer intentionally displays every active center.
      const centers = new Map<string, Center>();
      for (let page = 1; ; page++) {
        const response = unwrapList(await apiClient.get<ApiEnvelope<Center[]>>("/centers/public", {
          params: { page, limit: 100 }, signal,
        }));
        response.data.filter(center => center.isActive !== false).forEach(center => centers.set(center.id, center));
        if (!response.data.length || !response.meta || page >= response.meta.totalPages) break;
      }
      return [...centers.values()];
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
