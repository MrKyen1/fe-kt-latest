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
import { tokenStorage } from "./tokenStorage";

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
  centers: {
    ...crudService<Center, CreateCenterRequest, UpdateCenterRequest>("/centers"),
    /**
     * Public API lấy danh sách cơ sở Kata Edu phục vụ Trang chủ và Footer (cho cả khách vãng lai & đã đăng nhập).
     * Endpoint ưu tiên: GET /api/v1/centers/public hoặc GET /api/v1/homepage/centers
     * Fallback: GET /api/v1/centers (nếu đã đăng nhập có token hợp lệ)
     * Tránh tuyệt đối lỗi 401 Unauthorized khi khách vãng lai duyệt website.
     */
    async publicList(): Promise<Center[]> {
      // 1. Thử gọi endpoint public chuyên biệt nếu Backend đã triển khai
      try {
        const response = await apiClient.get<ApiEnvelope<Center[]>>("/centers/public");
        const payload = response.data?.data;
        if (Array.isArray(payload) && payload.length > 0) {
          return payload.filter((c) => c.isActive !== false);
        }
      } catch {
        try {
          const response = await apiClient.get<ApiEnvelope<Center[]>>("/homepage/centers");
          const payload = response.data?.data;
          if (Array.isArray(payload) && payload.length > 0) {
            return payload.filter((c) => c.isActive !== false);
          }
        } catch {
          // Bỏ qua nếu backend chưa có route
        }
      }

      // 2. Nếu người dùng đã đăng nhập (có token còn hạn), gọi /centers
      const token = tokenStorage.getAccessToken();
      if (token && !tokenStorage.isAccessTokenExpired()) {
        try {
          const response = await apiClient.get<ApiEnvelope<Center[]>>("/centers");
          const payload = response.data?.data;
          if (Array.isArray(payload) && payload.length > 0) {
            return payload.filter((c) => c.isActive !== false);
          }
        } catch {
          // Bỏ qua lỗi phân quyền
        }
      }

      // 3. Fallback danh sách mặc định an toàn cho Footer không làm vỡ giao diện
      return [
        {
          id: "default-center-1",
          name: "Kata Academy - Cơ sở Bắc Giang",
          address: "123 Đình Cả, Quảng Minh, Việt Yên, Bắc Giang",
          phone: "0123 456 789",
          email: "contact@kataedu.vn",
          isActive: true,
        },
      ];
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
